package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const pegawaiCacheTTL = 5 * time.Minute

type PegawaiController struct {
	DB          *gorm.DB
	RedisClient *redis.Client
}

// PegawaiResponse is the response structure for pegawai data (excludes password)
type PegawaiResponse struct {
	ID          uint        `json:"id"`
	NamaLengkap string      `json:"nama_lengkap"`
	Email       string      `json:"email"`
	Role        models.Role `json:"-"`
	Departemen  string      `json:"departemen"`
	Kantor      string      `json:"kantor"`
	Status      string      `json:"status"`
}

type UserWithEmploye struct {
	models.User
	Divisi string
	Status string
	Kantor string
}

type UserWithFullEmploye struct {
	models.User
	Divisi       string
	Status       string
	Nik          string
	KaryawanID   *int
	JenisKelamin string
	Agama        string
	TempatLahir  string
	TanggalLahir string
	Alamat       string
	NoTelp       string
	Jabatan      string
}

type PegawaiDetailResponse struct {
	ID           uint        `json:"id"`
	NamaLengkap  string      `json:"nama_lengkap"`
	Email        string      `json:"email"`
	Role         models.Role `json:"-"`
	Departemen   string      `json:"departemen"`
	Status       string      `json:"status"`
	Nik          string      `json:"nik"`
	KaryawanID   *int        `json:"karyawan_id"`
	JenisKelamin string      `json:"jenis_kelamin"`
	Agama        string      `json:"agama"`
	TempatLahir  string      `json:"tempat_lahir"`
	TanggalLahir string      `json:"tanggal_lahir"`
	Alamat       string      `json:"alamat"`
	NoTelp       string      `json:"no_telp"`
	Jabatan      string      `json:"jabatan"`
}

// CreatePegawaiRequest is the request body for creating a pegawai
type CreatePegawaiRequest struct {
	NamaLengkap string `json:"nama_lengkap"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

// UpdatePegawaiRequest is the request body for updating a pegawai
type UpdatePegawaiRequest struct {
	NamaLengkap string `json:"nama_lengkap"`
	Email       string `json:"email"`
	Password    string `json:"password"` // optional, kosong berarti tidak diubah
	Departemen  string `json:"departemen"`
	Status      string `json:"status"`
	KaryawanID  *int   `json:"karyawan_id"`
}

// toResponse converts a User model to PegawaiResponse
func toResponse(u models.User) PegawaiResponse {
	return PegawaiResponse{
		ID:          u.ID,
		NamaLengkap: u.NamaLengkap,
		Email:       u.Email,
		Role:        u.Role,
	}
}

// invalidateCache removes the pegawai cache from Redis
func (p *PegawaiController) invalidateCache() {
	ctx := context.Background()
	iter := p.RedisClient.Scan(ctx, 0, "cache:pegawai:*", 0).Iterator()
	for iter.Next(ctx) {
		p.RedisClient.Del(ctx, iter.Val())
	}
}

// ─────────────────────────────────────────────
// GET all pegawai — with Redis caching
// ─────────────────────────────────────────────
func (p *PegawaiController) GetAllPegawai(c *fiber.Ctx) error {
	ctx := context.Background()

	search := c.Query("search", "")
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	offset := (page - 1) * limit
	cacheKey := fmt.Sprintf("cache:pegawai:search:%s:page:%d:limit:%d", search, page, limit)

	// Try to get from cache
	cached, err := p.RedisClient.Get(ctx, cacheKey).Result()
	if err == nil {
		// Cache hit — parse and return
		var cachedData fiber.Map
		if json.Unmarshal([]byte(cached), &cachedData) == nil {
			return utils.SuccessResponse(c, cachedData)
		}
	}

	// Cache miss — count total and query database
	var total int64
	countQuery := p.DB.Model(&models.User{}).Where("users.role = ?", models.RolePegawai)
	if search != "" {
		countQuery = countQuery.Where("users.nama_lengkap LIKE ? OR users.email LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count pegawai data")
	}

	var totalAktif int64
	if err := p.DB.Model(&models.User{}).
		Joins("LEFT JOIN employes ON employes.user_id = users.id").
		Where("users.role = ?", models.RolePegawai).
		Where("LOWER(employes.status) = ? OR LOWER(employes.status) = ?", "k", "aktif").Count(&totalAktif).Error; err != nil {
		totalAktif = 0
	}

	var totalNonAktif int64
	if err := p.DB.Model(&models.User{}).
		Joins("LEFT JOIN employes ON employes.user_id = users.id").
		Where("users.role = ?", models.RolePegawai).
		Where("LOWER(employes.status) != ? AND LOWER(employes.status) != ? OR employes.status IS NULL", "k", "aktif").Count(&totalNonAktif).Error; err != nil {
		totalNonAktif = 0
	}

	var usersWithEmployes []UserWithEmploye
	query := p.DB.Model(&models.User{}).
		Select("users.*, employes.divisi as divisi, employes.status as status, employes.kantor as kantor").
		Joins("LEFT JOIN employes ON employes.user_id = users.id").
		Where("users.role = ?", models.RolePegawai)

	if search != "" {
		query = query.Where("users.nama_lengkap LIKE ? OR users.email LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Limit(limit).Offset(offset).Find(&usersWithEmployes).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai data")
	}

	response := make([]PegawaiResponse, 0, len(usersWithEmployes))
	for _, u := range usersWithEmployes {
		response = append(response, PegawaiResponse{
			ID:          u.ID,
			NamaLengkap: u.NamaLengkap,
			Email:       u.Email,
			Role:        u.Role,
			Departemen:  u.Divisi,
			Kantor:      u.Kantor,
			Status:      u.Status,
		})
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	data := fiber.Map{
		"total":           total,
		"total_aktif":     totalAktif,
		"total_non_aktif": totalNonAktif,
		"page":            page,
		"limit":           limit,
		"total_pages":     totalPages,
		"pegawai":         response,
	}

	// Store in cache
	if jsonData, err := json.Marshal(data); err == nil {
		p.RedisClient.Set(ctx, cacheKey, string(jsonData), pegawaiCacheTTL)
	}

	return utils.SuccessResponse(c, data)
}

// ─────────────────────────────────────────────
// GET pegawai by ID
// ─────────────────────────────────────────────
func (p *PegawaiController) GetPegawaiByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var userWithEmploye UserWithFullEmploye
	if err := p.DB.Model(&models.User{}).
		Select("users.*, employes.divisi as divisi, employes.status as status, employes.nik as nik, employes.karyawan_id as karyawan_id, employes.jenis_kelamin as jenis_kelamin, employes.agama as agama, employes.tempat_lahir as tempat_lahir, employes.tanggal_lahir as tanggal_lahir, employes.alamat as alamat, employes.no_telp as no_telp, employes.jabatan as jabatan").
		Joins("LEFT JOIN employes ON employes.user_id = users.id").
		Where("users.id = ? AND users.role = ?", id, models.RolePegawai).
		First(&userWithEmploye).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Pegawai not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai: "+err.Error())
	}

	response := PegawaiDetailResponse{
		ID:           userWithEmploye.ID,
		NamaLengkap:  userWithEmploye.NamaLengkap,
		Email:        userWithEmploye.Email,
		Role:         userWithEmploye.Role,
		Departemen:   userWithEmploye.Divisi,
		Status:       userWithEmploye.Status,
		Nik:          userWithEmploye.Nik,
		KaryawanID:   userWithEmploye.KaryawanID,
		JenisKelamin: userWithEmploye.JenisKelamin,
		Agama:        userWithEmploye.Agama,
		TempatLahir:  userWithEmploye.TempatLahir,
		TanggalLahir: userWithEmploye.TanggalLahir,
		Alamat:       userWithEmploye.Alamat,
		NoTelp:       userWithEmploye.NoTelp,
		Jabatan:      userWithEmploye.Jabatan,
	}

	return utils.SuccessResponse(c, response)
}

// ─────────────────────────────────────────────
// POST create pegawai — invalidate cache
// ─────────────────────────────────────────────
func (p *PegawaiController) CreatePegawai(c *fiber.Ctx) error {
	var req CreatePegawaiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.NamaLengkap == "" || req.Email == "" || req.Password == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Name, email, and password are required")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
	}

	user := models.User{
		NamaLengkap: req.NamaLengkap,
		Email:       req.Email,
		Password:    string(hashedPassword),
		Role:        models.RolePegawai,
	}

	if err := p.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return utils.ErrorResponse(c, fiber.StatusConflict, "Email already exists")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create pegawai")
	}

	// Invalidate cache
	p.invalidateCache()

	return c.Status(fiber.StatusCreated).JSON(utils.Response{
		Success: true,
		Message: "Pegawai created successfully",
		Data:    toResponse(user),
	})
}

// ─────────────────────────────────────────────
// PUT update pegawai — invalidate cache
// ─────────────────────────────────────────────
func (p *PegawaiController) UpdatePegawai(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := p.DB.Where("id = ? AND role = ?", id, models.RolePegawai).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Pegawai not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai")
	}

	var req UpdatePegawaiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	tx := p.DB.Begin()

	// Update fields jika dikirim
	if req.NamaLengkap != "" {
		user.NamaLengkap = req.NamaLengkap
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
		}
		user.Password = string(hashedPassword)
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		if strings.Contains(err.Error(), "duplicate") {
			return utils.ErrorResponse(c, fiber.StatusConflict, "Email already exists")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update pegawai user data")
	}

	// Update fields di employes
	if req.Departemen != "" || req.Status != "" || req.KaryawanID != nil {
		var employe models.Employes
		if err := tx.Where("user_id = ?", user.ID).First(&employe).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Satisfy LokasiID foreign key constraint
				var defaultLoc models.Location
				if errLoc := tx.First(&defaultLoc).Error; errLoc != nil {
					defaultLoc = models.Location{
						NamaLokasi: "Kantor Pusat (Default)",
						Radius:     100,
					}
					tx.Create(&defaultLoc)
				}

				// Create new employes record if it doesn't exist
				employe = models.Employes{
					UserID:   user.ID,
					LokasiID: defaultLoc.ID,
					Divisi:     req.Departemen,
					Status:     req.Status,
					KaryawanID: req.KaryawanID,
				}
				if err := tx.Create(&employe).Error; err != nil {
					tx.Rollback()
					return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create employes data")
				}
			} else {
				tx.Rollback()
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to check employes data")
			}
		} else {
			// Update existing
			updates := map[string]interface{}{}
			if req.Departemen != "" {
				updates["divisi"] = req.Departemen
			}
			if req.Status != "" {
				updates["status"] = req.Status
			}
			if req.KaryawanID != nil {
				updates["karyawan_id"] = req.KaryawanID
			}
			if err := tx.Model(&employe).Updates(updates).Error; err != nil {
				tx.Rollback()
				return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update employes data")
			}
		}
	}

	tx.Commit()

	// Invalidate cache
	p.invalidateCache()

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Pegawai updated successfully",
	})
}

// ─────────────────────────────────────────────
// DELETE pegawai — invalidate cache
// ─────────────────────────────────────────────
func (p *PegawaiController) DeletePegawai(c *fiber.Ctx) error {
	id := c.Params("id")

	var user models.User
	if err := p.DB.Where("id = ? AND role = ?", id, models.RolePegawai).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Pegawai not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai")
	}

	// Soft delete (GORM menggunakan deleted_at jika ada gorm.Model)
	if err := p.DB.Delete(&user).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete pegawai")
	}

	// Invalidate cache
	p.invalidateCache()

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Pegawai deleted successfully",
	})
}

// ─────────────────────────────────────────────
// Sync from external API
// ─────────────────────────────────────────────
type SyncAPIResponse struct {
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Data    []SyncEmployee `json:"data"`
}

type SyncEmployee struct {
	Id      int    `json:"Id"`
	Nik     string `json:"nik"`
	Nama    string `json:"nama"`
	Jabatan string `json:"jabatan"`
	Bagian  string `json:"bagian"`
	Kantor  string `json:"kantor"`
}

type AuthExtRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthExtResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		Token string `json:"token"`
	} `json:"data"`
}

func (p *PegawaiController) SyncPegawai(c *fiber.Ctx) error {
	// Configure HTTP client to skip TLS verify
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}

	// 1. Login to external API first
	loginPayload := AuthExtRequest{
		Username: "admin",
		Password: "54fcc26a58e14a6f5efc9b79ed784dad",
	}
	loginBytes, _ := json.Marshal(loginPayload)

	loginResp, err := client.Post("https://116.254.117.243/api-absensi/api/login.php", "application/json", bytes.NewBuffer(loginBytes))
	if err != nil {
		fmt.Println("Error connecting to login:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to connect to external login API: "+err.Error())
	}
	defer loginResp.Body.Close()

	loginBody, err := io.ReadAll(loginResp.Body)
	if err != nil {
		fmt.Println("Error reading login response:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to read external login response")
	}

	fmt.Println("Login response body:", string(loginBody))

	var authExtRes AuthExtResponse
	if err := json.Unmarshal(loginBody, &authExtRes); err != nil {
		fmt.Println("Error parsing login response:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to parse external login response")
	}

	if authExtRes.Data.Token == "" {
		fmt.Println("Token is empty. Response status:", authExtRes.Status)
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Failed to get token from external API")
	}

	// 2. Fetch data using Bearer Token
	req, err := http.NewRequest("GET", "https://116.254.117.243/api-absensi/api/", nil)
	if err != nil {
		fmt.Println("Error creating GET request:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create request for external API")
	}
	req.Header.Add("Authorization", "Bearer "+authExtRes.Data.Token)

	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error fetching data:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch from external API: "+err.Error())
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading data response:", err)
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to read API response")
	}

	fmt.Println("Data response length:", len(body))

	var apiRes SyncAPIResponse
	if err := json.Unmarshal(body, &apiRes); err != nil {
		fmt.Println("Error parsing data response:", string(body[:200])) // print first 200 chars
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to parse API response: "+err.Error())
	}

	if len(apiRes.Data) == 0 {
		return utils.SuccessResponse(c, fiber.Map{"message": "No data found", "imported_count": 0, "skipped_count": 0})
	}

	var locationCache = make(map[string]uint)
	importedCount := 0
	skippedCount := 0

	defaultPassword, _ := bcrypt.GenerateFromPassword([]byte("nasari123"), bcrypt.DefaultCost)

	for _, empData := range apiRes.Data {
		nik := strings.TrimSpace(empData.Nik)
		nama := strings.TrimSpace(empData.Nama)
		kantor := strings.TrimSpace(empData.Kantor)

		if nik == "" {
			skippedCount++
			continue
		}

		// Check if employe exists
		var existingEmploye models.Employes
		if err := p.DB.Where("nik = ?", nik).First(&existingEmploye).Error; err == nil {
			// Exists, skip
			skippedCount++
			continue
		}

		tx := p.DB.Begin()

		// 1. User
		var user models.User
		if err := tx.Where("email = ?", nik).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new user, mapping email to NIK
				user = models.User{
					Email:       nik,
					Password:    string(defaultPassword),
					NamaLengkap: nama,
					Role:        models.RolePegawai,
				}
				if err := tx.Create(&user).Error; err != nil {
					tx.Rollback()
					skippedCount++
					continue
				}
			} else {
				tx.Rollback()
				skippedCount++
				continue
			}
		}

		// 2. Location
		lokasiID, ok := locationCache[kantor]
		if !ok {
			var location models.Location
			if err := tx.Where("nama_lokasi = ?", kantor).First(&location).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					location = models.Location{
						NamaLokasi: kantor,
						Radius:     100,
					}
					if err := tx.Create(&location).Error; err != nil {
						tx.Rollback()
						skippedCount++
						continue
					}
				} else {
					tx.Rollback()
					skippedCount++
					continue
				}
			}
			lokasiID = location.ID
			locationCache[kantor] = lokasiID
		}

		// 3. Employes
		employe := models.Employes{
			UserID:   user.ID,
			LokasiID: lokasiID,
			Nik:      nik,
			Divisi:   empData.Bagian,
			Jabatan:  empData.Jabatan,
			Kantor:   kantor,
			Status:   "Aktif",
		}

		if err := tx.Create(&employe).Error; err != nil {
			tx.Rollback()
			skippedCount++
			continue
		}

		tx.Commit()
		importedCount++
	}

	p.invalidateCache()

	return utils.SuccessResponse(c, fiber.Map{
		"message":        "Synchronization completed",
		"imported_count": importedCount,
		"skipped_count":  skippedCount,
	})
}
