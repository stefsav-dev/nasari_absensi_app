package connection

import (
	"backend_absensi/models"
	"errors"
	"log"
	"os"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func ConnectDatabase() *gorm.DB {

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := dbUser + ":" + dbPassword + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName + "?charset=utf8mb4&parseTime=True&loc=Local"
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("Database connection established")

	if err := db.AutoMigrate(&models.User{}, &models.Absensi{}, &models.Profile{}, &models.Lokasi{}); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	seedDefaultUsers(db)

	return db
}

func seedDefaultUsers(db *gorm.DB) {
	users := []models.User{
		{
			Email:    "admin@nasari.test",
			Password: "admin123",
			Name:     "Admin Nasari",
			Role:     models.RoleAdmin,
		},
		{
			Email:    "superadmin@nasari.test",
			Password: "superadmin123",
			Name:     "Superadmin Nasari",
			Role:     models.RoleSuperadmin,
		},
	}

	for _, user := range users {
		var existingUser models.User
		err := db.Where("email = ?", user.Email).First(&existingUser).Error
		if err == nil {
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Fatal("Failed to check default user:", err)
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash default user password:", err)
		}

		user.Password = string(hashedPassword)
		if err := db.Create(&user).Error; err != nil {
			log.Fatal("Failed to seed default user:", err)
		}

		log.Println("Default user created:", user.Email)
	}
}
