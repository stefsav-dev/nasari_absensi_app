package models

import (
	"time"

	"gorm.io/gorm"
)

type Absensi struct {
	gorm.Model
	UserID          uint      `json:"user_id" gorm:"not null"`
	AbsensiID       string    `json:"absensi_id" gorm:"unique;not null"`
	User            User      `json:"user" gorm:"foreignKey:UserID"`
	Status          string    `json:"status" gorm:"not null"`
	AbsensiMasuk    *time.Time `json:"absensi_masuk"`
	AbsensiPulang   *time.Time `json:"absensi_pulang"`
	FotoMasuk       string    `json:"foto_masuk" gorm:"type:longtext"`
	FotoPulang      string    `json:"foto_pulang" gorm:"type:longtext"`
	LatitudeMasuk   float64   `json:"latitude_masuk"`
	LongitudeMasuk  float64   `json:"longitude_masuk"`
	AkurasiMasuk    float64   `json:"akurasi_masuk"`
	LatitudePulang  float64   `json:"latitude_pulang"`
	LongitudePulang float64   `json:"longitude_pulang"`
	AkurasiPulang   float64   `json:"akurasi_pulang"`
}

func (Absensi) TableName() string {
	return "absensi"
}
