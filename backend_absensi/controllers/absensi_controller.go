package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"strconv"
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
	ID            uint      `json:"id"`
	UserID        uint      `json:"user_id"`
	AbsensiID     string    `json:"absensi_id"`
	Status        string    `json:"status"`
	AbsensiMasuk  time.Time `json:"absensi_masuk"`
	AbsensiPulang time.Time `json:"absensi_pulang"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	User          UserInfo  `json:"user"`
}

func toAbsensiResponse(a models.Absensi) AbsensiResponse {
	return AbsensiResponse{
		ID:            a.ID,
		UserID:        a.UserID,
		AbsensiID:     a.AbsensiID,
		Status:        a.Status,
		AbsensiMasuk:  a.AbsensiMasuk,
		AbsensiPulang: a.AbsensiPulang,
		CreatedAt:     a.CreatedAt,
		UpdatedAt:     a.UpdatedAt,
		User: UserInfo{
			ID:    a.User.ID,
			Name:  a.User.NamaLengkap,
			Email: a.User.Email,
		},
	}
}

type CreateAbsensiRequest struct {
	UserID        uint   `json:"user_id"`
	Status        string `json:"status"`
	AbsensiMasuk  string `json:"absensi_masuk"`  // RFC3339 formatted time
	AbsensiPulang string `json:"absensi_pulang"` // RFC3339 formatted time (optional)
}

type UpdateAbsensiRequest struct {
	Status        string `json:"status"`
	AbsensiMasuk  string `json:"absensi_masuk"`
	AbsensiPulang string `json:"absensi_pulang"`
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

// ─────────────────────────────────────────────
// POST create absensi
// ─────────────────────────────────────────────
func (ac *AbsensiController) CreateAbsensi(c *fiber.Ctx) error {
	var req CreateAbsensiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.UserID == 0 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "User ID is required")
	}
	if req.Status == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Status is required")
	}

	var absensiMasuk, absensiPulang time.Time
	var err error

	if req.AbsensiMasuk != "" {
		absensiMasuk, err = time.Parse(time.RFC3339, req.AbsensiMasuk)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_masuk (use RFC3339)")
		}
	} else {
		// Default to current time if not provided
		absensiMasuk = time.Now()
	}

	if req.AbsensiPulang != "" {
		absensiPulang, err = time.Parse(time.RFC3339, req.AbsensiPulang)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_pulang (use RFC3339)")
		}
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
		UserID:        req.UserID,
		AbsensiID:     absensiID,
		Status:        req.Status,
		AbsensiMasuk:  absensiMasuk,
		AbsensiPulang: absensiPulang,
	}

	if err := ac.DB.Create(&absensi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create absensi")
	}

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

	var req UpdateAbsensiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Status != "" {
		absensi.Status = req.Status
	}

	if req.AbsensiMasuk != "" {
		masuk, err := time.Parse(time.RFC3339, req.AbsensiMasuk)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_masuk (use RFC3339)")
		}
		absensi.AbsensiMasuk = masuk
	}

	if req.AbsensiPulang != "" {
		pulang, err := time.Parse(time.RFC3339, req.AbsensiPulang)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid format for absensi_pulang (use RFC3339)")
		}
		absensi.AbsensiPulang = pulang
	}

	if err := ac.DB.Save(&absensi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update absensi")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Absensi updated successfully",
		"absensi": toAbsensiResponse(absensi),
	})
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
