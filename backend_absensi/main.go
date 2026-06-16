package main

import (
	"backend_absensi/connection"
	"backend_absensi/handler"
	"backend_absensi/routes"
	"log"
	"os"
	"strings"

	"github.com/gofiber/contrib/swagger"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "4000"
	}
	listenAddr := port
	if listenAddr[0] != ':' {
		listenAddr = ":" + listenAddr
	}
	publicPort := strings.TrimPrefix(port, ":")

	// Connect to database
	db := connection.ConnectDatabase()

	// Ensure columns are LONGTEXT for base64 images (GORM AutoMigrate doesn't expand existing VARCHAR columns)
	db.Exec("ALTER TABLE absensi MODIFY foto_masuk LONGTEXT, MODIFY foto_pulang LONGTEXT;")
	// Increase max_allowed_packet to 64MB to allow large base64 image payloads
	db.Exec("SET GLOBAL max_allowed_packet = 67108864;")

	// Connect to Redis
	redisClient := connection.ConnectRedis()

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		BodyLimit: 15 * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	routes.SetupRoutes(app, db, redisClient)

	app.Use(swagger.New(swagger.Config{
		BasePath:    "/",
		FilePath:    "swagger.json",
		FileContent: handler.BuildSwaggerSpec(publicPort),
		Path:        "docs",
		Title:       "Nasari Absensi API",
	}))

	// Start server
	log.Println("Server starting on port", publicPort)
	if err := app.Listen(listenAddr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
