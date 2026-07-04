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

	db := connection.ConnectDatabase()

	db.Exec("ALTER TABLE absensi MODIFY foto_masuk LONGTEXT, MODIFY foto_pulang LONGTEXT;")
	db.Exec("SET GLOBAL max_allowed_packet = 67108864;")

	redisClient := connection.ConnectRedis()

	app := fiber.New(fiber.Config{
		BodyLimit: 15 * 1024 * 1024,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

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

	log.Println("Server starting on port", publicPort)
	if err := app.Listen(listenAddr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
