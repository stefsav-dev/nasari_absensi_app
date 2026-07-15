package services

import (
	"backend_absensi/models"
	"fmt"
	"log"
	"time"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

var CronScheduler *cron.Cron

func InitCron(db *gorm.DB) {
	// Use Jakarta timezone
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Println("Error loading timezone, using local:", err)
		loc = time.Local
	}

	CronScheduler = cron.New(cron.WithLocation(loc))

	// 1. Cron Job at 08:05 WIB - Check for users who haven't checked in
	_, err = CronScheduler.AddFunc("5 8 * * *", func() {
		checkTerlambatAndNotify(db)
	})
	if err != nil {
		log.Println("Error scheduling terlambat cron:", err)
	}

	// 2. Cron Job at 16:59 WIB - Remind to check out
	_, err = CronScheduler.AddFunc("59 16 * * *", func() {
		remindPulangAndNotify(db)
	})
	if err != nil {
		log.Println("Error scheduling remind pulang cron:", err)
	}

	CronScheduler.Start()
	log.Println("Cron jobs scheduled successfully")
}

func checkTerlambatAndNotify(db *gorm.DB) {
	log.Println("Executing checkTerlambatAndNotify cron job...")
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	// Get all pegawais who have an FCM token
	var pegawais []models.User
	if err := db.Where("role = ? AND fcm_token != ''", models.RolePegawai).Find(&pegawais).Error; err != nil {
		log.Println("Error fetching pegawais for cron:", err)
		return
	}

	for _, pegawai := range pegawais {
		// Check if they have an attendance record for today
		var count int64
		db.Model(&models.Absensi{}).
			Where("user_id = ? AND ((absensi_masuk >= ? AND absensi_masuk < ?) OR (created_at >= ? AND created_at < ?))",
				pegawai.ID, startOfDay, endOfDay, startOfDay, endOfDay).
			Count(&count)

		if count == 0 {
			// No record found today, they are late
			msgTitle := "Terlambat Absen!"
			msgBody := "Anda Terlambat Absen. Segera lakukan absensi masuk."
			
			err := SendPushNotification(pegawai.FcmToken, msgTitle, msgBody)
			if err != nil {
				log.Printf("Failed to send notification to user %d: %v\n", pegawai.ID, err)
			} else {
				log.Printf("Sent late notification to user %d\n", pegawai.ID)
			}
		}
	}
}

func remindPulangAndNotify(db *gorm.DB) {
	log.Println("Executing remindPulangAndNotify cron job...")
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	// Get all absensi records for today where people have checked in but not checked out
	var absensis []models.Absensi
	if err := db.Preload("User").
		Where("((absensi_masuk >= ? AND absensi_masuk < ?) OR (created_at >= ? AND created_at < ?)) AND absensi_pulang IS NULL",
			startOfDay, endOfDay, startOfDay, endOfDay).
		Find(&absensis).Error; err != nil {
		log.Println("Error fetching absensis for pulang cron:", err)
		return
	}

	for _, absensi := range absensis {
		if absensi.User.FcmToken != "" {
			msgTitle := "Waktunya Pulang!"
			msgBody := fmt.Sprintf("Halo %s, Jam Jam mau pulang nih, Jangan Lupa absen Pulang ya", absensi.User.NamaLengkap)
			
			err := SendPushNotification(absensi.User.FcmToken, msgTitle, msgBody)
			if err != nil {
				log.Printf("Failed to send pulang reminder to user %d: %v\n", absensi.User.ID, err)
			} else {
				log.Printf("Sent pulang reminder to user %d\n", absensi.User.ID)
			}
		}
	}
}
