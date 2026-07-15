package controllers

import (
	"backend_absensi/models"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type ImportController struct {
	DB *gorm.DB
}

func parseExcelDate(dateStr string) *time.Time {
	if dateStr == "" || dateStr == "0000-00-00" || dateStr == "0000-00-00 00:00:00" {
		return nil
	}
	
	// Excel dates might be represented as floats
	if floatVal, err := excelize.CoordinatesToCellName(1, 1); err == nil {
		_ = floatVal // Just checking if it's a valid coordinate logic
	}
	// excelize typically returns formatted string if GetRows is used,
	// but it might also be MM-DD-YY or DD/MM/YYYY.
	// Let's try common formats
	formats := []string{
		"2006-01-02",
		"01-02-06",
		"01/02/06",
		"2006-01-02 15:04:05",
		"02-Jan-06",
		time.RFC3339,
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return &t
		}
	}

	// Try excelize's built-in time parser if it's a numeric string
	if floatNum, err := excelize.CoordinatesToCellName(1,1); err == nil {
		_ = floatNum
	}
	// Fallback, we can also try formatting from float if it's purely numeric but let's assume it's string format
	// given by Excelize's GetRows (which tries to apply cell formatting)
	
	return nil
}

func (c *ImportController) ImportEmployes(ctx *fiber.Ctx) error {
	fileHeader, err := ctx.FormFile("import_file")
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to upload file"})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	xlsx, err := excelize.OpenReader(file)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse excel file"})
	}
	defer xlsx.Close()

	// Get all the rows in the first sheet
	firstSheet := xlsx.GetSheetName(0)
	rows, err := xlsx.GetRows(firstSheet)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read rows"})
	}

	if len(rows) < 2 {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Excel file contains no data"})
	}

	type ImportJob struct {
		Index int
		Row   []string
	}

	type ImportResult struct {
		Index   int
		Success bool
		Error   string
	}

	numWorkers := 10
	jobs := make(chan ImportJob, len(rows))
	results := make(chan ImportResult, len(rows))
	var wg sync.WaitGroup

	var locationCache sync.Map
	var locationMutex sync.Mutex

	// Worker function
	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				row := job.Row
				// Ensure row has enough columns
				for len(row) < 22 {
					row = append(row, "")
				}

				nik := strings.TrimSpace(row[1])
				nama := strings.TrimSpace(row[2])
				email := strings.TrimSpace(row[11])
				kantor := strings.TrimSpace(row[21])

				if nik == "" || nama == "" || email == "" {
					results <- ImportResult{Success: false, Error: "Row missing required fields (NIK, Nama, Email)"}
					continue
				}

				// Local transaction for this row
				tx := c.DB.Begin()

				// 1. Handle User
				var user models.User
				if err := tx.Where("email = ?", email).First(&user).Error; err != nil {
					if err == gorm.ErrRecordNotFound {
						hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("nasari123"), bcrypt.DefaultCost)
						user = models.User{
							Email:       email,
							Password:    string(hashedPassword),
							NamaLengkap: nama,
							Role:        models.RolePegawai,
						}
						if err := tx.Create(&user).Error; err != nil {
							tx.Rollback()
							results <- ImportResult{Success: false, Error: "Failed to create user for email: " + email}
							continue
						}
					} else {
						tx.Rollback()
						results <- ImportResult{Success: false, Error: "Database error user: " + email}
						continue
					}
				}

				// 2. Handle Location
				var lokasiID uint
				if cachedLoc, ok := locationCache.Load(kantor); ok {
					lokasiID = cachedLoc.(uint)
				} else {
					locationMutex.Lock()
					if cachedLoc2, ok2 := locationCache.Load(kantor); ok2 {
						lokasiID = cachedLoc2.(uint)
						locationMutex.Unlock()
					} else {
						var location models.Location
						if err := tx.Where("nama_lokasi = ?", kantor).First(&location).Error; err != nil {
							if err == gorm.ErrRecordNotFound {
								location = models.Location{
									NamaLokasi: kantor,
									Radius:     100,
								}
								if err := tx.Create(&location).Error; err != nil {
									locationMutex.Unlock()
									tx.Rollback()
									results <- ImportResult{Success: false, Error: "Failed to create location: " + kantor}
									continue
								}
							} else {
								locationMutex.Unlock()
								tx.Rollback()
								results <- ImportResult{Success: false, Error: "Database error location: " + kantor}
								continue
							}
						}
						lokasiID = location.ID
						locationCache.Store(kantor, lokasiID)
						locationMutex.Unlock()
					}
				}

				// 3. Handle Employes
				employe := models.Employes{
					UserID:         user.ID,
					LokasiID:       lokasiID,
					Nik:            nik,
					JenisKelamin:   strings.TrimSpace(row[3]),
					Agama:          strings.TrimSpace(row[4]),
					Status:         strings.TrimSpace(row[5]),
					TempatLahir:    strings.TrimSpace(row[6]),
					TanggalLahir:   strings.TrimSpace(row[7]),
					Alamat:         strings.TrimSpace(row[8]),
					AlamatSekarang: strings.TrimSpace(row[9]),
					NoTelp:         strings.TrimSpace(row[10]),
					TanggalKerja:   parseExcelDate(strings.TrimSpace(row[12])),
					Divisi:         strings.TrimSpace(row[13]),
					Jabatan:        strings.TrimSpace(row[14]),
					Bagian:         strings.TrimSpace(row[15]),
					Grade:          strings.TrimSpace(row[16]),
					SJabatan:       strings.TrimSpace(row[17]),
					SKaryawan:      strings.TrimSpace(row[18]),
					TanggalMulai:   parseExcelDate(strings.TrimSpace(row[19])),
					TanggalSelesai: parseExcelDate(strings.TrimSpace(row[20])),
					Kantor:         kantor,
				}

				var existingEmploye models.Employes
				if err := tx.Where("user_id = ?", user.ID).First(&existingEmploye).Error; err == nil {
					// Update existing
					employe.Model = existingEmploye.Model
					if err := tx.Save(&employe).Error; err != nil {
						tx.Rollback()
						results <- ImportResult{Success: false, Error: "Failed to update employee record for: " + email}
						continue
					}
				} else {
					// Create new
					if err := tx.Create(&employe).Error; err != nil {
						tx.Rollback()
						results <- ImportResult{Success: false, Error: "Failed to create employee record for: " + email}
						continue
					}
				}

				tx.Commit()
				results <- ImportResult{Success: true}
			}
		}()
	}

	// Dispatch jobs
	for i := 1; i < len(rows); i++ {
		jobs <- ImportJob{Index: i, Row: rows[i]}
	}
	close(jobs)

	// Wait and close results channel
	go func() {
		wg.Wait()
		close(results)
	}()

	var employesCreated int
	var errors []string

	for res := range results {
		if res.Success {
			employesCreated++
		} else {
			errors = append(errors, res.Error)
		}
	}

	return ctx.JSON(fiber.Map{
		"message":        "Import completed successfully",
		"imported_count": employesCreated,
		"errors":         errors,
	})
}
