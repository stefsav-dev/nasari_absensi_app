package controllers

import (
	"backend_absensi/config"
	"backend_absensi/models"
	"backend_absensi/utils"
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"log"
)

type AuthController struct {
	DB          *gorm.DB
	RedisClient *redis.Client
}

type LoginRequest struct {
	Nik      string `json:"nik" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email       string      `json:"email" binding:"required,email"`
	Password    string      `json:"password" binding:"required"`
	NamaLengkap string      `json:"nama_lengkap" binding:"required"`
	Role        models.Role `json:"role"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

func (a *AuthController) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	var user models.User
	if err := a.DB.Joins("JOIN employes ON employes.user_id = users.id").Where("employes.nik = ?", req.Nik).First(&user).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid NIK or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid NIK or password")
	}

	accessToken, err := config.JWTAuth.GenerateAccessToken(user.ID, user.Email, string(user.Role))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate access token")
	}
	refreshToken, err := config.JWTAuth.GenerateRefreshToken(user.ID, user.Email, string(user.Role))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	return c.JSON(TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(config.JWTAuth.AccessExpiration.Seconds()),
	})
}

func (a *AuthController) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Set default role if empty
	if req.Role == "" {
		req.Role = models.RolePegawai
	}

	// Validate role
	if req.Role != models.RoleSuperadmin && req.Role != models.RoleAdmin && req.Role != models.RoleAdminKantorCabang && req.Role != models.RolePegawai {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid role")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
	}

	// Create user
	user := models.User{
		Email:       req.Email,
		Password:    string(hashedPassword),
		NamaLengkap: req.NamaLengkap,
		Role:        req.Role,
	}

	if err := a.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return utils.ErrorResponse(c, fiber.StatusConflict, "Email already exists")
		}
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create user")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"email":        user.Email,
		"nama_lengkap": user.NamaLengkap,
	})
}

// Refresh Token handler
func (a *AuthController) RefreshToken(c *fiber.Ctx) error {
	var req RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Verify refresh token
	claims, err := config.JWTAuth.VerifyRefreshToken(req.RefreshToken)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid or expired refresh token")
	}

	// Check if user still exists
	var user models.User
	if err := a.DB.First(&user, claims.UserID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "User not found")
	}

	// Generate new tokens
	newAccessToken, err := config.JWTAuth.GenerateAccessToken(user.ID, user.Email, string(user.Role))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate access token")
	}

	newRefreshToken, err := config.JWTAuth.GenerateRefreshToken(user.ID, user.Email, string(user.Role))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate refresh token")
	}

	return utils.SuccessResponse(c, TokenResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(config.JWTAuth.AccessExpiration.Seconds()),
	})
}

// Logout handler — blacklist token in Redis
func (a *AuthController) Logout(c *fiber.Ctx) error {
	// Get the token from Authorization header
	authHeader := c.Get("Authorization")
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid authorization header")
	}
	tokenString := parts[1]

	// Get claims to determine remaining TTL
	claims, err := config.JWTAuth.VerifyAccessToken(tokenString)
	if err != nil {
		// Token already invalid, just return success
		return utils.SuccessResponse(c, fiber.Map{
			"message": "Logged out successfully",
		})
	}

	// Calculate remaining TTL
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl > 0 {
		// Blacklist token in Redis with remaining TTL
		ctx := context.Background()

		// Fallback to getting redis client from locals if a.RedisClient is somehow closed
		rClient := a.RedisClient
		if localsRedis, ok := c.Locals("redis").(*redis.Client); ok && localsRedis != nil {
			rClient = localsRedis
		}

		if err := rClient.Set(ctx, "blacklist:"+tokenString, "revoked", ttl).Err(); err != nil {
			// If client is closed, try to reconnect locally as fallback
			if err.Error() == "redis: client is closed" {
				log.Println("Redis client closed. Reconnecting locally for logout...")
				tempClient := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
				if tempErr := tempClient.Set(ctx, "blacklist:"+tokenString, "revoked", ttl).Err(); tempErr == nil {
					return utils.SuccessResponse(c, fiber.Map{"message": "Logged out successfully (reconnected)"})
				}
				tempClient.Close()
			}
			log.Printf("Redis Set Error during logout: %v\n", err)
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to revoke token: "+err.Error())
		}
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Logged out successfully",
	})
}

// Get Profile handler
func (a *AuthController) GetProfile(c *fiber.Ctx) error {
	// Get user from context (set by auth middleware)
	user := c.Locals("user").(*config.Claims)

	var userData models.User
	if err := a.DB.First(&userData, user.UserID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"id":           userData.ID,
		"email":        userData.Email,
		"nama_lengkap": userData.NamaLengkap,
		"role":         userData.Role,
		"foto":         userData.Foto,
	})
}

type UpdateProfileRequest struct {
	NamaLengkap string `json:"nama_lengkap"`
	Foto        string `json:"foto"`
	Password    string `json:"password"`
}

// Update Profile handler
func (a *AuthController) UpdateProfile(c *fiber.Ctx) error {
	user := c.Locals("user").(*config.Claims)

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}

	var userData models.User
	if err := a.DB.First(&userData, user.UserID).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}

	if req.NamaLengkap != "" {
		userData.NamaLengkap = req.NamaLengkap
	}
	if req.Foto != "" {
		userData.Foto = req.Foto
	}
	if req.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to hash password")
		}
		userData.Password = string(hashedPassword)
	}

	if err := a.DB.Save(&userData).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update profile")
	}

	return utils.SuccessResponse(c, fiber.Map{
		"message": "Profile updated successfully",
		"user": fiber.Map{
			"id":           userData.ID,
			"email":        userData.Email,
			"nama_lengkap": userData.NamaLengkap,
			"role":         userData.Role,
			"foto":         userData.Foto,
		},
	})
}
