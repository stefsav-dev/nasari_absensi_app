package models

import (
	"time"

	"gorm.io/gorm"
)

type Absensi struct {
	gorm.Model
	UserID        uint      `json:"user_id" gorm:"not null"`
	AbsensiID     string    `json:"absensi_id" gorm:"unique;not null"`
	User          User      `json:"user" gorm:"foreignKey:UserID"`
	Status        string    `json:"status" gorm:"not null"`
	AbsensiMasuk  time.Time `json:"absensi_masuk"`
	AbsensiPulang time.Time `json:"absensi_pulang"`
}

func (Absensi) TableName() string {
	return "absensi"
}
