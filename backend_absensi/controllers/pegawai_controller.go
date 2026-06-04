package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"context"
	"encoding/json"
	"fmt"
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
	Role        models.Role `json:"role"`
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

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	offset := (page - 1) * limit
	cacheKey := fmt.Sprintf("cache:pegawai:page:%d:limit:%d", page, limit)

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
	if err := p.DB.Model(&models.User{}).Where("role = ?", models.RolePegawai).Count(&total).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count pegawai data")
	}

	var users []models.User
	if err := p.DB.Where("role = ?", models.RolePegawai).Limit(limit).Offset(offset).Find(&users).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai data")
	}

	response := make([]PegawaiResponse, 0, len(users))
	for _, u := range users {
		response = append(response, toResponse(u))
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	data := fiber.Map{
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
		"pegawai":     response,
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

	var user models.User
	if err := p.DB.Where("id = ? AND role = ?", id, models.RolePegawai).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Pegawai not found")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve pegawai")
	}

	return utils.SuccessResponse(c, toResponse(user))
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
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
		}
		user.Password = string(hashedPassword)
	}

	if err := p.DB.Save(&user).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return utils.ErrorResponse(c, fiber.StatusConflict, "Email already exists")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update pegawai")
	}

	// Invalidate cache
	p.invalidateCache()

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Pegawai updated successfully",
		"pegawai": toResponse(user),
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
