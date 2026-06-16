package routes

import (
	"backend_absensi/controllers"
	"backend_absensi/middleware"
	"backend_absensi/models"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, redisClient *redis.Client) {
	authController := &controllers.AuthController{DB: db, RedisClient: redisClient}
	pegawaiController := &controllers.PegawaiController{DB: db, RedisClient: redisClient}
	lokasiController := &controllers.LokasiController{DB: db}
	absensiController := &controllers.AbsensiController{DB: db, RedisClient: redisClient}
	exportController := &controllers.ExportController{DB: db}

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Welcome to the Nasari Absensi API!"})
	})

	api := app.Group("/api")
	api.Post("/login", authController.Login)
	api.Post("/register", authController.Register)
	api.Post("/refresh-token", authController.RefreshToken)
	api.Get("/location", lokasiController.GetAllLokasi)

	protected := api.Group("/protected")
	protected.Use(func(c *fiber.Ctx) error {
		c.Locals("redis", redisClient)
		return c.Next()
	})
	protected.Use(middleware.AuthMiddleware())
	protected.Get("/profile", authController.GetProfile)
	protected.Put("/profile", authController.UpdateProfile)
	protected.Post("/logout", authController.Logout)

	adminRoutes := protected.Group("/admin")
	adminRoutes.Use(middleware.AuthMiddleware(string(models.RoleAdmin), string(models.RoleSuperadmin)))
	adminRoutes.Get("/dashboard", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Welcome to the admin dashboard!"})
	})

	// Pegawai routes
	adminRoutes.Get("/pegawai", pegawaiController.GetAllPegawai)

	// Absensi routes
	adminRoutes.Get("/absensi", absensiController.GetAllAbsensi)
	adminRoutes.Get("/absensi-export", exportController.ExportAbsensiExcel)
	adminRoutes.Get("/absensi/export", exportController.ExportAbsensiExcel)
	adminRoutes.Get("/absensi/:id", absensiController.GetAbsensiByID)
	adminRoutes.Post("/absensi", absensiController.CreateAbsensi)
	adminRoutes.Put("/absensi/:id", absensiController.UpdateAbsensi)
	adminRoutes.Delete("/absensi/:id", absensiController.DeleteAbsensi)

	// Lokasi routes
	adminRoutes.Get("/lokasi", lokasiController.GetAllLokasi)
	adminRoutes.Get("/lokasi/:id", lokasiController.GetLokasiByID)
	adminRoutes.Post("/lokasi", lokasiController.CreateLokasi)
	adminRoutes.Put("/lokasi/:id", lokasiController.UpdateLokasi)
	adminRoutes.Delete("/lokasi/:id", lokasiController.DeleteLokasi)

	superAdminRoutes := protected.Group("/superadmin")
	superAdminRoutes.Use(middleware.AuthMiddleware(string(models.RoleSuperadmin)))
	superAdminRoutes.Get("/dashboard", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Welcome to the superadmin dashboard!"})
	})

	// Super Admin Pegawai routes
	superAdminRoutes.Get("/pegawai", pegawaiController.GetAllPegawai)
	superAdminRoutes.Get("/pegawai/:id", pegawaiController.GetPegawaiByID)
	superAdminRoutes.Post("/pegawai", pegawaiController.CreatePegawai)
	superAdminRoutes.Put("/pegawai/:id", pegawaiController.UpdatePegawai)
	superAdminRoutes.Delete("/pegawai/:id", pegawaiController.DeletePegawai)

	// Lokasi routes
	superAdminRoutes.Get("/lokasi", lokasiController.GetAllLokasi)
	superAdminRoutes.Get("/lokasi/:id", lokasiController.GetLokasiByID)
	superAdminRoutes.Post("/lokasi", lokasiController.CreateLokasi)
	superAdminRoutes.Put("/lokasi/:id", lokasiController.UpdateLokasi)
	superAdminRoutes.Delete("/lokasi/:id", lokasiController.DeleteLokasi)

	// Absensi routes
	superAdminRoutes.Get("/absensi", absensiController.GetAllAbsensi)
	superAdminRoutes.Get("/absensi-export", exportController.ExportAbsensiExcel)
	superAdminRoutes.Get("/absensi/export", exportController.ExportAbsensiExcel)
	superAdminRoutes.Get("/absensi/:id", absensiController.GetAbsensiByID)
	superAdminRoutes.Post("/absensi", absensiController.CreateAbsensi)
	superAdminRoutes.Put("/absensi/:id", absensiController.UpdateAbsensi)
	superAdminRoutes.Delete("/absensi/:id", absensiController.DeleteAbsensi)

	//admin kantor cabang routes
	adminKantorCabangRoutes := protected.Group("/adm_kantor_cabang")
	adminKantorCabangRoutes.Use(middleware.AuthMiddleware(string(models.RoleAdminKantorCabang)))
	adminKantorCabangRoutes.Get("/dashboard", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Welcome to the admin kantor cabang dashboard!"})
	})

	// Admin Kantor Cabang Pegawai routes
	adminKantorCabangRoutes.Get("/pegawai", pegawaiController.GetAllPegawai)
	adminKantorCabangRoutes.Get("/pegawai/:id", pegawaiController.GetPegawaiByID)
	adminKantorCabangRoutes.Post("/pegawai", pegawaiController.CreatePegawai)
	adminKantorCabangRoutes.Put("/pegawai/:id", pegawaiController.UpdatePegawai)
	adminKantorCabangRoutes.Delete("/pegawai/:id", pegawaiController.DeletePegawai)

	// Pegawai Routes
	pegawaiRoutes := protected.Group("/pegawai")
	pegawaiRoutes.Use(middleware.AuthMiddleware(string(models.RolePegawai), string(models.RoleAdmin), string(models.RoleSuperadmin)))
	pegawaiRoutes.Get("/dashboard", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Welcome to the pegawai dashboard!"})
	})
	pegawaiRoutes.Get("/profile", authController.GetProfile)

	//absensi routes
	pegawaiRoutes.Get("/absensi", absensiController.GetTodayAbsensi)
	pegawaiRoutes.Get("/absensi/history", absensiController.GetMyAbsensiHistory)
	pegawaiRoutes.Post("/absensi", absensiController.CreateAbsensi)
	pegawaiRoutes.Put("/absensi/:id", absensiController.UpdateAbsensi)

}
