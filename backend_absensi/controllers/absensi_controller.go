package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"bytes"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AbsensiController struct {
	DB          *gorm.DB
	RedisClient *redis.Client
}

// UserInfo is a minimal struct for user data in responses
type UserInfo struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// AbsensiResponse is the JSON response structure
type AbsensiResponse struct {
	ID              uint      `json:"id"`
	UserID          uint      `json:"user_id"`
	AbsensiID       string    `json:"absensi_id"`
	Status          string    `json:"status"`
	AbsensiMasuk    *time.Time `json:"absensi_masuk"`
	AbsensiPulang   *time.Time `json:"absensi_pulang"`
	HasFotoMasuk    bool      `json:"has_foto_masuk"`
	HasFotoPulang   bool      `json:"has_foto_pulang"`
	LatitudeMasuk   float64   `json:"latitude_masuk"`
	LongitudeMasuk  float64   `json:"longitude_masuk"`
	AkurasiMasuk    float64   `json:"akurasi_masuk"`
	LatitudePulang  float64   `json:"latitude_pulang"`
	LongitudePulang float64   `json:"longitude_pulang"`
	AkurasiPulang   float64   `json:"akurasi_pulang"`
	NamaLokasi      string    `json:"nama_lokasi"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	Keterangan      string    `json:"keterangan"`
	User            UserInfo  `json:"user"`
}

func toAbsensiResponse(a models.Absensi) AbsensiResponse {
	return AbsensiResponse{
		ID:              a.ID,
		UserID:          a.UserID,
		AbsensiID:       a.AbsensiID,
		Status:          a.Status,
		AbsensiMasuk:    a.AbsensiMasuk,
		AbsensiPulang:   a.AbsensiPulang,
		HasFotoMasuk:    a.FotoMasuk != "",
		HasFotoPulang:   a.FotoPulang != "",
		LatitudeMasuk:   a.LatitudeMasuk,
		LongitudeMasuk:  a.LongitudeMasuk,
		AkurasiMasuk:    a.AkurasiMasuk,
		LatitudePulang:  a.LatitudePulang,
		LongitudePulang: a.LongitudePulang,
		AkurasiPulang:   a.AkurasiPulang,
		NamaLokasi:      a.NamaLokasi,
		CreatedAt:       a.CreatedAt,
		UpdatedAt:       a.UpdatedAt,
		Keterangan:      a.Keterangan,
		User: UserInfo{
			ID:    a.User.ID,
			Name:  a.User.NamaLengkap,
			Email: a.User.Email,
		},
	}
}

type CreateAbsensiRequest struct {
	UserID         uint    `json:"user_id"`
	Status         string  `json:"status"`
	AbsensiMasuk   string  `json:"absensi_masuk"`  // RFC3339 formatted time
	AbsensiPulang  string  `json:"absensi_pulang"` // RFC3339 formatted time (optional)
	FotoMasuk      string  `json:"foto_masuk"`
	FotoPulang     string  `json:"foto_pulang"`
	Latitude       float64 `json:"latitude"`
	Longitude      float64 `json:"longitude"`
	Akurasi        float64 `json:"akurasi"`
	LatitudeMasuk  float64 `json:"latitude_masuk"`
	LongitudeMasuk float64 `json:"longitude_masuk"`
	AkurasiMasuk   float64 `json:"akurasi_masuk"`
	NamaLokasi     string  `json:"nama_lokasi"`
	Keterangan     string  `json:"keterangan"`
}

type UpdateAbsensiRequest struct {
	Status          string  `json:"status"`
	AbsensiMasuk    string  `json:"absensi_masuk"`
	AbsensiPulang   string  `json:"absensi_pulang"`
	FotoMasuk       string  `json:"foto_masuk"`
	FotoPulang      string  `json:"foto_pulang"`
	LatitudePulang  float64 `json:"latitude_pulang"`
	LongitudePulang float64 `json:"longitude_pulang"`
	AkurasiPulang   float64 `json:"akurasi_pulang"`
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	Akurasi         float64 `json:"akurasi"`
	Keterangan      string  `json:"keterangan"`
}

// ─────────────────────────────────────────────
// GET all absensi
// ─────────────────────────────────────────────
func (ac *AbsensiController) GetAllAbsensi(c *fiber.Ctx) error {
	var absensis []models.Absensi
	if err := ac.DB.Preload("User").Find(&absensis).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi data")
	}

	response := make([]AbsensiResponse, 0, len(absensis))
	for _, a := range absensis {
		response = append(response, toAbsensiResponse(a))
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total":   len(response),
		"absensi": response,
	})
}

// ─────────────────────────────────────────────
// GET absensi by ID
// ─────────────────────────────────────────────
func (ac *AbsensiController) GetAbsensiByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var absensi models.Absensi
	if err := ac.DB.Preload("User").First(&absensi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Absensi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi")
	}

	return utils.SuccessResponse(c, toAbsensiResponse(absensi))
}

func (ac *AbsensiController) GetTodayAbsensi(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "User ID not found")
	}

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	var absensi models.Absensi
	if err := ac.DB.Preload("User").
		Where("user_id = ? AND ( (absensi_masuk >= ? AND absensi_masuk < ?) OR (created_at >= ? AND created_at < ?) )", userID, startOfDay, endOfDay, startOfDay, endOfDay).
		Order("created_at DESC").
		First(&absensi).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.SuccessResponse(c, fiber.Map{
				"absensi": nil,
			})
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve today's absensi: "+err.Error())
	}

	return utils.SuccessResponse(c, fiber.Map{
		"absensi": toAbsensiResponse(absensi),
	})
}

// ─────────────────────────────────────────────
// GET my absensi history
// ─────────────────────────────────────────────
func (ac *AbsensiController) GetMyAbsensiHistory(c *fiber.Ctx) error {
	fmt.Println("HIT GetMyAbsensiHistory endpoint!")
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "User ID not found")
	}

	var absensis []models.Absensi
	if err := ac.DB.Preload("User").Where("user_id = ?", userID).Order("absensi_masuk desc").Find(&absensis).Error; err != nil {
		fmt.Println("DB error:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi history")
	}

	fmt.Println("Found", len(absensis), "history records")
	response := make([]AbsensiResponse, 0, len(absensis))
	for _, a := range absensis {
		response = append(response, toAbsensiResponse(a))
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total":   len(response),
		"absensi": response,
	})
}

// ─────────────────────────────────────────────
// POST create absensi
// ─────────────────────────────────────────────
func (ac *AbsensiController) CreateAbsensi(c *fiber.Ctx) error {
	var req CreateAbsensiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.UserID == 0 {
		if userID, ok := c.Locals("user_id").(uint); ok {
			req.UserID = userID
		}
	}
	if req.UserID == 0 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "User ID is required")
	}
	if req.Status == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Status is required")
	}
	if !isValidStatus(req.Status) {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid status provided")
	}

	var absensiMasuk *time.Time
	var absensiPulang *time.Time

	if req.AbsensiMasuk != "" {
		t, err := time.Parse(time.RFC3339, req.AbsensiMasuk)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_masuk (use RFC3339)")
		}
		absensiMasuk = &t
	} else if req.Status == "Hadir" {
		// Default to current time if not provided, ONLY for "Hadir"
		now := time.Now()
		absensiMasuk = &now
	}

	if req.AbsensiPulang != "" {
		t, err := time.Parse(time.RFC3339, req.AbsensiPulang)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_pulang (use RFC3339)")
		}
		absensiPulang = &t
	}

	// Verify User exists
	var user models.User
	if err := ac.DB.First(&user, req.UserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error verifying user")
	}

	absensiID := uuid.New().String()

	absensi := models.Absensi{
		UserID:         req.UserID,
		AbsensiID:      absensiID,
		Status:         req.Status,
		AbsensiMasuk:   absensiMasuk,
		AbsensiPulang:  absensiPulang,
		FotoMasuk:      req.FotoMasuk,
		FotoPulang:     req.FotoPulang,
		LatitudeMasuk:  firstNonZero(req.LatitudeMasuk, req.Latitude),
		LongitudeMasuk: firstNonZero(req.LongitudeMasuk, req.Longitude),
		AkurasiMasuk:   firstNonZero(req.AkurasiMasuk, req.Akurasi),
		NamaLokasi:     req.NamaLokasi,
		Keterangan:     req.Keterangan,
	}

	if err := ac.DB.Create(&absensi).Error; err != nil {
		fmt.Println("DB Create Error:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create absensi")
	}

	// Push to external API
	go PushAbsensiToExternalAPI(ac.DB, req.UserID, &absensi)

	// Preload User manually for the response
	absensi.User = user

	return c.Status(fiber.StatusCreated).JSON(utils.Response{
		Success: true,
		Message: "Absensi created successfully",
		Data:    toAbsensiResponse(absensi),
	})
}

// ─────────────────────────────────────────────
// PUT update absensi
// ─────────────────────────────────────────────
func (ac *AbsensiController) UpdateAbsensi(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var absensi models.Absensi
	if err := ac.DB.Preload("User").First(&absensi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Absensi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi")
	}
	if role, _ := c.Locals("user_role").(string); role == string(models.RolePegawai) {
		if userID, ok := c.Locals("user_id").(uint); ok && absensi.UserID != userID {
			return utils.ErrorResponse(c, fiber.StatusForbidden, "Access denied. Cannot update another user's absensi")
		}
	}

	var req UpdateAbsensiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Status != "" {
		if !isValidStatus(req.Status) {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid status provided")
		}
		absensi.Status = req.Status
	}

	if req.AbsensiMasuk != "" {
		masuk, err := time.Parse(time.RFC3339, req.AbsensiMasuk)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_masuk (use RFC3339)")
		}
		absensi.AbsensiMasuk = &masuk
	}

	if req.AbsensiPulang != "" {
		pulang, err := time.Parse(time.RFC3339, req.AbsensiPulang)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_pulang (use RFC3339)")
		}
		absensi.AbsensiPulang = &pulang
	}
	if req.FotoMasuk != "" {
		absensi.FotoMasuk = req.FotoMasuk
	}
	if req.FotoPulang != "" {
		absensi.FotoPulang = req.FotoPulang
	}
	if req.LatitudePulang != 0 || req.Latitude != 0 {
		absensi.LatitudePulang = firstNonZero(req.LatitudePulang, req.Latitude)
	}
	if req.LongitudePulang != 0 || req.Longitude != 0 {
		absensi.LongitudePulang = firstNonZero(req.LongitudePulang, req.Longitude)
	}
	if req.AkurasiPulang != 0 || req.Akurasi != 0 {
		absensi.AkurasiPulang = firstNonZero(req.AkurasiPulang, req.Akurasi)
	}
	if req.Keterangan != "" {
		absensi.Keterangan = req.Keterangan
	}

	if err := ac.DB.Save(&absensi).Error; err != nil {
		fmt.Println("DB Update Error:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update absensi")
	}

	// Push to external API
	go PushAbsensiToExternalAPI(ac.DB, absensi.UserID, &absensi)

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Absensi updated successfully",
		"absensi": toAbsensiResponse(absensi),
	})
}

func firstNonZero(primary float64, fallback float64) float64 {
	if primary != 0 {
		return primary
	}
	return fallback
}

// ─────────────────────────────────────────────
// DELETE absensi (soft delete)
// ─────────────────────────────────────────────
func (ac *AbsensiController) DeleteAbsensi(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var absensi models.Absensi
	if err := ac.DB.First(&absensi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Absensi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi")
	}

	if err := ac.DB.Delete(&absensi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete absensi")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Absensi deleted successfully",
	})
}

// ─────────────────────────────────────────────
// External Sync Helper
// ─────────────────────────────────────────────
type ExtAbsensiPayload struct {
	KaryawanID int     `json:"karyawan_id"`
	Tanggal    string  `json:"tanggal"`
	JamMasuk   string  `json:"jam_masuk"`
	JamKeluar  string  `json:"jam_keluar"`
	Keterangan *string `json:"keterangan"`
}

func PushAbsensiToExternalAPI(db *gorm.DB, userID uint, absensi *models.Absensi) {
	// Let it run in background safely, recover from panics
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("Recovered in PushAbsensiToExternalAPI:", r)
		}
	}()

	var employe models.Employes
	if err := db.Where("user_id = ?", userID).First(&employe).Error; err != nil {
		fmt.Println("Failed to find employe for external sync:", err)
		return
	}

	// Format dates
	var tanggal, jamMasuk, jamKeluar string
	if absensi.AbsensiMasuk != nil {
		tanggal = absensi.AbsensiMasuk.Format("2006-01-02")
		jamMasuk = absensi.AbsensiMasuk.Format("15:04:05")
	}

	if absensi.AbsensiPulang != nil {
		jamKeluar = absensi.AbsensiPulang.Format("15:04:05")
		if tanggal == "" {
			tanggal = absensi.AbsensiPulang.Format("2006-01-02")
		}
	}

	var ket *string
	if absensi.Keterangan != "" {
		k := absensi.Keterangan
		ket = &k
	}

	payload := ExtAbsensiPayload{
		KaryawanID: int(employe.ID),
		Tanggal:    tanggal,
		JamMasuk:   jamMasuk,
		JamKeluar:  jamKeluar,
		Keterangan: ket,
	}

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr, Timeout: 10 * time.Second}

	// 1. Login
	loginPayload := map[string]string{
		"username": "admin",
		"password": "54fcc26a58e14a6f5efc9b79ed784dad",
	}
	loginBytes, _ := json.Marshal(loginPayload)
	loginResp, err := client.Post("https://116.254.117.243/api-absensi/api/login.php", "application/json", bytes.NewBuffer(loginBytes))
	if err != nil {
		fmt.Println("PushAbsensi: Failed to login:", err)
		return
	}
	defer loginResp.Body.Close()

	var authRes struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	if err := json.NewDecoder(loginResp.Body).Decode(&authRes); err != nil {
		fmt.Println("PushAbsensi: Failed to decode login response:", err)
		return
	}
	if authRes.Data.Token == "" {
		fmt.Println("PushAbsensi: Token is empty")
		return
	}

	// 2. Post Absensi
	payloadBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", "https://116.254.117.243/api-absensi/api/", bytes.NewBuffer(payloadBytes))
	if err != nil {
		fmt.Println("PushAbsensi: Failed to create request:", err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+authRes.Data.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("PushAbsensi: Failed to post data:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		fmt.Println("PushAbsensi: Successfully synced attendance for KaryawanID:", employe.ID)
	} else {
		bodyBytes, _ := io.ReadAll(resp.Body)
		fmt.Printf("PushAbsensi: Failed to sync, status %d, body: %s\n", resp.StatusCode, string(bodyBytes))
	}
}

func isValidStatus(status string) bool {
	switch models.StatusAbsensi(status) {
	case models.StatusHadir, models.StatusSakit, models.StatusIjin,
		models.StatusAlpha, models.StatusDinasLuar, models.StatusCutiTahunan,
		models.StatusCutiBersalin, models.StatusCutiAlasanPenting, models.StatusCutiDiluarTanggungan:
		return true
	}
	return false
}

// ─────────────────────────────────────────────
// GET absensi photo
// ─────────────────────────────────────────────
func (ac *AbsensiController) GetAbsensiPhoto(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid ID")
	}

	photoType := c.Query("type", "masuk") // "masuk" or "pulang"

	var absensi models.Absensi
	if err := ac.DB.Select("id", "user_id", "foto_masuk", "foto_pulang").First(&absensi, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).SendString("Absensi not found")
	}

	// Authorization check
	userID, ok := c.Locals("user_id").(uint)
	role, _ := c.Locals("user_role").(string)
	
	if ok && role != string(models.RoleAdmin) && role != string(models.RoleSuperadmin) && role != string(models.RoleAdminKantorCabang) {
		if absensi.UserID != userID {
			return c.Status(fiber.StatusForbidden).SendString("Forbidden")
		}
	}

	var base64Data string
	if photoType == "pulang" {
		base64Data = absensi.FotoPulang
	} else {
		base64Data = absensi.FotoMasuk
	}

	if base64Data == "" {
		return c.Status(fiber.StatusNotFound).SendString("Photo not found")
	}

	// Remove data URI prefix if exists
	idx := strings.Index(base64Data, "base64,")
	if idx != -1 {
		base64Data = base64Data[idx+7:]
	}

	decoded, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to decode photo")
	}

	c.Set("Content-Type", "image/jpeg")
	c.Set("Cache-Control", "public, max-age=86400")
	return c.Send(decoded)
}
