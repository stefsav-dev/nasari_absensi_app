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

	// Connect to Redis
	redisClient := connection.ConnectRedis()

	// Initialize Fiber
	app := fiber.New(fiber.Config{
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
		AllowMethods: "GET,POST,PUT,DELETE",
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
