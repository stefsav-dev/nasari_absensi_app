package models

import (
	"time"

	"gorm.io/gorm"
)

type Employes struct {
	gorm.Model
	UserID         uint      `json:"user_id" gorm:"not null"`
	LokasiID       uint      `json:"lokasi_id" gorm:"not null"`
	User           User      `json:"user" gorm:"foreignKey:UserID"`
	Location       Location  `json:"location" gorm:"foreignKey:LokasiID"`
	Nik            string    `json:"nik"`
	JenisKelamin   string    `json:"jenis_kelamin"`
	Agama          string    `json:"agama"`
	Status         string    `json:"status"`
	TempatLahir    string    `json:"tempat_lahir"`
	TanggalLahir   string    `json:"tanggal_lahir"`
	Alamat         string    `json:"alamat"`
	AlamatSekarang string    `json:"alamat_sekarang"`
	NoTelp         string    `json:"no_telp"`
	TanggalKerja   *time.Time `json:"tanggal_kerja"`
	Divisi         string    `json:"divisi"`
	Jabatan        string    `json:"jabatan"`
	Bagian         string    `json:"bagian"`
	Grade          string    `json:"grade"`
	SJabatan       string    `json:"s_jabatan"`
	SKaryawan      string    `json:"s_karyawan"`
	TanggalMulai   *time.Time `json:"tanggal_mulai"`
	TanggalSelesai *time.Time `json:"tanggal_selesai"`
	Kantor         string    `json:"kantor"`
	Photo          string    `json:"photo"`
}

func (Employes) TableName() string {
	return "employes"
}
