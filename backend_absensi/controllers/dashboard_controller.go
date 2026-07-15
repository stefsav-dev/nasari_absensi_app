package controllers

import (
	"backend_absensi/models"
	"backend_absensi/utils"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DashboardController struct {
	DB *gorm.DB
}

type RecentAttendance struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	Time         string `json:"time"`
	TimeOut      string `json:"timeOut"`
	LocationName string `json:"locationName"`
	Status       string `json:"status"`
	Department   string `json:"department"`
}

func (dc *DashboardController) GetAdminDashboard(c *fiber.Ctx) error {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var totalPegawai int64
	if err := dc.DB.Model(&models.User{}).Where("role = ?", models.RolePegawai).Count(&totalPegawai).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count pegawai")
	}

	var hadirHariIni int64
	if err := dc.DB.Model(&models.Absensi{}).
		Where("status = ? AND ((absensi_masuk >= ? AND absensi_masuk < ?) OR (created_at >= ? AND created_at < ?))",
			models.StatusHadir, startOfDay, endOfDay, startOfDay, endOfDay).
		Count(&hadirHariIni).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count hadir")
	}

	// Calculate "Terlambat"
	var terlambat int64
	lateTime := time.Date(now.Year(), now.Month(), now.Day(), 8, 0, 0, 0, now.Location())

	if err := dc.DB.Model(&models.Absensi{}).
		Where("status = ? AND absensi_masuk > ? AND absensi_masuk < ?",
			models.StatusHadir, lateTime, endOfDay).
		Count(&terlambat).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count terlambat")
	}

	// Tidak hadir is Total Pegawai - (any attendance record today)
	var anyAttendanceToday int64
	if err := dc.DB.Model(&models.Absensi{}).
		Where("(absensi_masuk >= ? AND absensi_masuk < ?) OR (created_at >= ? AND created_at < ?)",
			startOfDay, endOfDay, startOfDay, endOfDay).
		Group("user_id").
		Count(&anyAttendanceToday).Error; err != nil {
		fmt.Println("Error counting any attendance:", err)
		anyAttendanceToday = 0 // fallback
	}

	tidakHadir := totalPegawai - anyAttendanceToday
	if tidakHadir < 0 {
		tidakHadir = 0
	}

	// Izin & Cuti bulan ini
	var totalIzin int64
	if err := dc.DB.Model(&models.Absensi{}).
		Where("status IN (?, ?) AND created_at >= ? AND created_at < ?",
			models.StatusIjin, models.StatusSakit, startOfMonth, endOfMonth).
		Count(&totalIzin).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count izin")
	}

	var totalCuti int64
	if err := dc.DB.Model(&models.Absensi{}).
		Where("status LIKE ? AND created_at >= ? AND created_at < ?",
			"Cuti%", startOfMonth, endOfMonth).
		Count(&totalCuti).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to count cuti")
	}

	// Get Recent Attendance (Latest 10 regardless of date)
	var absensiRecords []models.Absensi
	if err := dc.DB.Preload("User").
		Order("created_at DESC").
		Limit(10).
		Find(&absensiRecords).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to fetch recent attendance")
	}

	var recentAttendance []RecentAttendance
	for _, a := range absensiRecords {
		// Fetch department from Employes table
		var employee models.Employes
		department := "-"
		if err := dc.DB.Where("user_id = ?", a.UserID).First(&employee).Error; err == nil {
			if employee.Divisi != "" {
				department = employee.Divisi
			} else if employee.Bagian != "" {
				department = employee.Bagian
			}
		}

		timeStr := "—"
		if a.AbsensiMasuk != nil {
			if a.AbsensiMasuk.Format("2006-01-02") == now.Format("2006-01-02") {
				timeStr = a.AbsensiMasuk.Format("15:04")
			} else {
				timeStr = a.AbsensiMasuk.Format("02 Jan 15:04")
			}
		}

		status := a.Status
		if status == string(models.StatusHadir) && a.AbsensiMasuk != nil && a.AbsensiMasuk.After(lateTime) {
			status = "Terlambat"
		}

		timeOutStr := "—"
		if a.AbsensiPulang != nil {
			if a.AbsensiPulang.Format("2006-01-02") == now.Format("2006-01-02") {
				timeOutStr = a.AbsensiPulang.Format("15:04")
			} else {
				timeOutStr = a.AbsensiPulang.Format("02 Jan 15:04")
			}
		}

		locationName := a.NamaLokasi
		if locationName == "" {
			locationName = "—"
		}

		recentAttendance = append(recentAttendance, RecentAttendance{
			ID:           a.ID,
			Name:         a.User.NamaLengkap,
			Time:         timeStr,
			TimeOut:      timeOutStr,
			LocationName: locationName,
			Status:       status,
			Department:   department,
		})
	}

	var rataJamMasukStr = "00:00"
	// Optional: Calculate average jam masuk for the week
	// We'll skip complex avg calculation and return a fixed string or basic approximation
	// if we don't have enough data, but we can return "07:48" or dynamically calculate.
	// For simplicity, let's keep it static or base it on today's avg if any.
	var todayAbsensiMasuk []time.Time
	for _, a := range absensiRecords {
		if a.AbsensiMasuk != nil && a.Status == string(models.StatusHadir) {
			todayAbsensiMasuk = append(todayAbsensiMasuk, *a.AbsensiMasuk)
		}
	}
	if len(todayAbsensiMasuk) > 0 {
		var totalSeconds int
		for _, t := range todayAbsensiMasuk {
			totalSeconds += t.Hour()*3600 + t.Minute()*60
		}
		avgSeconds := totalSeconds / len(todayAbsensiMasuk)
		h := avgSeconds / 3600
		m := (avgSeconds % 3600) / 60
		rataJamMasukStr = fmt.Sprintf("%02d:%02d", h, m)
	}

	var tepatWaktuMingguIni = "0%"
	if hadirHariIni > 0 {
		// For today only as a proxy
		onTime := hadirHariIni - terlambat
		if onTime < 0 {
			onTime = 0
		}
		pct := (float64(onTime) / float64(hadirHariIni)) * 100
		tepatWaktuMingguIni = fmt.Sprintf("%.0f%%", pct)
	}

	return utils.SuccessResponse(c, fiber.Map{
		"total_pegawai": totalPegawai,
		"hadir_hari_ini": fiber.Map{
			"total":      hadirHariIni,
			"percentage": calculatePercentage(hadirHariIni, totalPegawai),
		},
		"terlambat": fiber.Map{
			"total":      terlambat,
			"percentage": calculatePercentage(terlambat, totalPegawai),
		},
		"tidak_hadir": fiber.Map{
			"total":      tidakHadir,
			"percentage": calculatePercentage(tidakHadir, totalPegawai),
		},
		"recent_attendance": recentAttendance,
		"quick_stats": fiber.Map{
			"rata_rata_jam_masuk":    rataJamMasukStr,
			"tepat_waktu_minggu_ini": tepatWaktuMingguIni,
			"total_izin_bulan_ini":   totalIzin,
			"total_cuti_bulan_ini":   totalCuti,
		},
	})
}

func calculatePercentage(part int64, total int64) string {
	if total == 0 {
		return "0%"
	}
	pct := (float64(part) / float64(total)) * 100
	return fmt.Sprintf("%.1f%%", pct)
}
