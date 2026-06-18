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
	Departemen  string      `json:"departemen"`
	Status      string      `json:"status"`
}

type UserWithEmploye struct {
	models.User
	Divisi string
	Status string
}

type UserWithFullEmploye struct {
	models.User
	Divisi       string
	Status       string
	Nik          string
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
	Role         models.Role `json:"role"`
	Departemen   string      `json:"departemen"`
	Status       string      `json:"status"`
	Nik          string      `json:"nik"`
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
		Select("users.*, employes.divisi as divisi, employes.status as status").
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
		Select("users.*, employes.divisi as divisi, employes.status as status, employes.nik as nik, employes.jenis_kelamin as jenis_kelamin, employes.agama as agama, employes.tempat_lahir as tempat_lahir, employes.tanggal_lahir as tanggal_lahir, employes.alamat as alamat, employes.no_telp as no_telp, employes.jabatan as jabatan").
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
	if req.Departemen != "" || req.Status != "" {
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
					Divisi:   req.Departemen,
					Status:   req.Status,
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
