package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type LokasiController struct {
	DB *gorm.DB
}

// LokasiResponse — explicit json tags so ID, CreatedAt, UpdatedAt
// are serialized as snake_case, not Go's default PascalCase from gorm.Model.
type LokasiResponse struct {
	ID         uint      `json:"id"`
	NamaLokasi string    `json:"nama_lokasi"`
	Latitude   float64   `json:"latitude"`
	Longitude  float64   `json:"longitude"`
	Radius     float64   `json:"radius"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// toLokasiResponse converts models.Lokasi → LokasiResponse
func toLokasiResponse(l models.Location) LokasiResponse {
	return LokasiResponse{
		ID:         l.ID,
		NamaLokasi: l.NamaLokasi,
		Latitude:   l.Latitude,
		Longitude:  l.Longitude,
		Radius:     l.Radius,
		CreatedAt:  l.CreatedAt,
		UpdatedAt:  l.UpdatedAt,
	}
}

// CreateLokasiRequest is the request body for creating a lokasi
type CreateLokasiRequest struct {
	NamaLokasi string  `json:"nama_lokasi"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Radius     float64 `json:"radius"`
}

// UpdateLokasiRequest is the request body for updating a lokasi
type UpdateLokasiRequest struct {
	NamaLokasi string  `json:"nama_lokasi"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	Radius     float64 `json:"radius"`
}

// ─────────────────────────────────────────────
// GET all lokasi
// ─────────────────────────────────────────────
func (l *LokasiController) GetAllLokasi(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	offset := (page - 1) * limit

	query := l.DB.Model(&models.Location{})

	if search != "" {
		query = query.Where("nama_lokasi LIKE ?", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count lokasi data")
	}

	var lokasi []models.Location
	if err := query.Offset(offset).Limit(limit).Find(&lokasi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve lokasi data")
	}

	response := make([]LokasiResponse, 0, len(lokasi))
	for _, loc := range lokasi {
		response = append(response, toLokasiResponse(loc))
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total":  total,
		"page":   page,
		"limit":  limit,
		"lokasi": response,
	})
}

// ─────────────────────────────────────────────
// GET lokasi by ID
// ─────────────────────────────────────────────
func (l *LokasiController) GetLokasiByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var lokasi models.Location
	if err := l.DB.First(&lokasi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Lokasi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve lokasi")
	}

	return utils.SuccessResponse(c, toLokasiResponse(lokasi))
}

// ─────────────────────────────────────────────
// POST create lokasi
// ─────────────────────────────────────────────
func (l *LokasiController) CreateLokasi(c *fiber.Ctx) error {
	var req CreateLokasiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.NamaLokasi == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Nama lokasi is required")
	}
	if req.Latitude == 0 || req.Longitude == 0 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Latitude and longitude are required")
	}
	if req.Radius <= 0 {
		req.Radius = 100
	}

	lokasi := models.Location{
		NamaLokasi: req.NamaLokasi,
		Latitude:   req.Latitude,
		Longitude:  req.Longitude,
		Radius:     req.Radius,
	}

	if err := l.DB.Create(&lokasi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create lokasi")
	}

	return c.Status(fiber.StatusCreated).JSON(utils.Response{
		Success: true,
		Message: "Lokasi created successfully",
		Data:    toLokasiResponse(lokasi),
	})
}

// ─────────────────────────────────────────────
// PUT update lokasi
// ─────────────────────────────────────────────
func (l *LokasiController) UpdateLokasi(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var lokasi models.Location
	if err := l.DB.First(&lokasi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Lokasi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve lokasi")
	}

	var req UpdateLokasiRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.NamaLokasi != "" {
		lokasi.NamaLokasi = req.NamaLokasi
	}
	if req.Latitude != 0 {
		lokasi.Latitude = req.Latitude
	}
	if req.Longitude != 0 {
		lokasi.Longitude = req.Longitude
	}
	if req.Radius > 0 {
		lokasi.Radius = req.Radius
	}

	if err := l.DB.Save(&lokasi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update lokasi")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Lokasi updated successfully",
		"lokasi":  toLokasiResponse(lokasi),
	})
}

// ─────────────────────────────────────────────
// DELETE lokasi (soft delete)
// ─────────────────────────────────────────────
func (l *LokasiController) DeleteLokasi(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid ID format")
	}

	var lokasi models.Location
	if err := l.DB.First(&lokasi, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Lokasi not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve lokasi")
	}

	if err := l.DB.Delete(&lokasi).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete lokasi")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Lokasi deleted successfully",
	})
}
