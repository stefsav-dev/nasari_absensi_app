package models

import "gorm.io/gorm"

type Profile struct {
	gorm.Model
	UserID      uint   `json:"user_id" gorm:"not null"`
	User        User   `json:"user" gorm:"foreignKey:UserID"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	Photo       string `json:"photo"`
}

func (Profile) TableName() string {
	return "profile"
}
