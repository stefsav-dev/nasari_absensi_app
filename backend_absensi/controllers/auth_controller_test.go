package controllers

import (
	"backend_absensi/config"
	"backend_absensi/models"
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupAuthTest() (*fiber.App, sqlmock.Sqlmock, *miniredis.Miniredis, *redis.Client, *AuthController) {
	// 1. Setup mock database
	db, mock, err := sqlmock.New()
	if err != nil {
		panic("Failed to open mock sql db")
	}

	dialector := postgres.New(postgres.Config{
		Conn:       db,
		DriverName: "postgres",
	})

	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		panic("Failed to open gorm db")
	}

	// 2. Setup miniredis
	mr, err := miniredis.Run()
	if err != nil {
		panic("Failed to open miniredis")
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	// 3. Initialize config for JWT
	config.JWTAuth = &config.JWTConfig{
		SecretKey:         "test-access-secret",
		RefreshSecretKey:  "test-refresh-secret",
		AccessExpiration:  time.Hour,
		RefreshExpiration: time.Hour * 24,
	}

	// 4. Setup AuthController
	authController := &AuthController{
		DB:          gormDB,
		RedisClient: redisClient,
	}

	// 5. Setup Fiber app
	app := fiber.New()
	app.Post("/login", authController.Login)
	app.Post("/register", authController.Register)

	return app, mock, mr, redisClient, authController
}

func TestRegister_Success(t *testing.T) {
	app, mock, mr, _, _ := setupAuthTest()
	defer mr.Close()

	reqBody := RegisterRequest{
		Email:       "test@example.com",
		Password:    "password123",
		NamaLengkap: "Test User",
		Role:        models.RolePegawai,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	// Mock expecting a CREATE query
	// GORM inserts use RETURNING id so we mock the row creation
	mock.ExpectBegin()
	mock.ExpectQuery(`INSERT INTO "users"`).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))
	mock.ExpectCommit()

	req := httptest.NewRequest("POST", "/register", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var responseBody map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&responseBody)

	assert.True(t, responseBody["success"].(bool))
	data := responseBody["data"].(map[string]interface{})
	assert.NotEmpty(t, data["access_token"])
	assert.NotEmpty(t, data["refresh_token"])
}

func TestLogin_Success(t *testing.T) {
	app, mock, mr, _, _ := setupAuthTest()
	defer mr.Close()

	password := "password123"
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	reqBody := LoginRequest{
		Nik:      "123456789",
		Password: password,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	// Mock expecting a SELECT query to find user
	rows := sqlmock.NewRows([]string{"id", "email", "password", "name", "role"}).
		AddRow(1, "test@example.com", string(hashedPassword), "Test User", "pegawai")

	mock.ExpectQuery(`SELECT \* FROM "users" WHERE email = \$1`).
		WithArgs("test@example.com", 1).
		WillReturnRows(rows)

	req := httptest.NewRequest("POST", "/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var responseBody map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&responseBody)

	assert.NotEmpty(t, responseBody["access_token"])
	assert.NotEmpty(t, responseBody["refresh_token"])
}

func TestLogin_InvalidCredentials(t *testing.T) {
	app, mock, mr, _, _ := setupAuthTest()
	defer mr.Close()

	reqBody := LoginRequest{
		Nik:      "070900073",
		Password: "nasari123",
	}
	bodyBytes, _ := json.Marshal(reqBody)

	// Mock user not found
	mock.ExpectQuery(`SELECT \* FROM "users" WHERE email = \$1`).
		WithArgs("test@example.com", 1).
		WillReturnRows(sqlmock.NewRows([]string{}))

	req := httptest.NewRequest("POST", "/login", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var responseBody map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&responseBody)

	assert.False(t, responseBody["success"].(bool))
	assert.Equal(t, "Invalid email or password", responseBody["error"])
}
