package models

import "gorm.io/gorm"

type Location struct {
	gorm.Model
	NamaLokasi string  `json:"nama_lokasi" gorm:"not null"`
	Latitude   float64 `json:"latitude" gorm:"not null"`
	Longitude  float64 `json:"longitude" gorm:"not null"`
	Radius     float64 `json:"radius" gorm:"not null;default:100"`
}

func (Location) TableName() string {
	return "location"
}
