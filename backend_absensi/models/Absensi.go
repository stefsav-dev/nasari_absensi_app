package models

import (
	"time"

	"gorm.io/gorm"
)

type StatusAbsensi string

const (
	StatusHadir                          StatusAbsensi = "Hadir"
	StatusSakit                          StatusAbsensi = "Sakit"
	StatusIjin                           StatusAbsensi = "Ijin"
	StatusAlpha                          StatusAbsensi = "Alpha"
	StatusDinasLuar                      StatusAbsensi = "Dinas Luar"
	StatusCutiTahunan                    StatusAbsensi = "Cuti Tahunan"
	StatusCutiBersalin                   StatusAbsensi = "Cuti Bersalin (Melahirkan)"
	StatusCutiAlasanPenting              StatusAbsensi = "Cuti Karena Alasan Penting"
	StatusCutiDiluarTanggungan           StatusAbsensi = "Cuti Diluar Tanggungan Perusahaan"
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
	NamaLokasi      string    `json:"nama_lokasi" gorm:"type:varchar(255)"`
	Keterangan      string    `json:"keterangan" gorm:"type:text"`
}

func (Absensi) TableName() string {
	return "absensi"
}
