package models

import "gorm.io/gorm"

type Role string

const (
	RoleSuperadmin        Role = "superadmin"
	RoleAdmin             Role = "admin"
	RoleAdminKantorCabang Role = "admin_kantor_cabang"
	RolePegawai           Role = "pegawai"
)

type User struct {
	gorm.Model
	Email       string `json:"email" gorm:"unique;not null"`
	Password    string `json:"password" gorm:"not null"`
	NamaLengkap string `json:"nama_lengkap" gorm:"not null"`
	Role        Role   `json:"role" gorm:"not null"`
	Foto        string `json:"foto" gorm:"type:longtext"`
	FcmToken    string `json:"fcm_token"`
}
