package controllers

import (
	"archive/zip"
	"backend_absensi/models"
	"backend_absensi/utils"
	"bytes"
	"encoding/xml"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ExportController struct {
	DB *gorm.DB
}

func (ec *ExportController) ExportAbsensiExcel(c *fiber.Ctx) error {
	var absensis []models.Absensi

	query := ec.DB.Preload("User").Order("absensi_masuk DESC")
	if startDate := c.Query("start_date"); startDate != "" {
		start, err := time.Parse("2006-01-02", startDate)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid start_date format (use YYYY-MM-DD)")
		}
		query = query.Where("absensi_masuk >= ?", start)
	}

	if endDate := c.Query("end_date"); endDate != "" {
		end, err := time.Parse("2006-01-02", endDate)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid end_date format (use YYYY-MM-DD)")
		}
		query = query.Where("absensi_masuk < ?", end.AddDate(0, 0, 1))
	}

	if err := query.Find(&absensis).Error; err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to retrieve absensi data")
	}

	file, err := buildAbsensiExcel(absensis)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate Excel file")
	}

	filename := fmt.Sprintf("export_absensi_%s.xlsx", time.Now().Format("20060102_150405"))
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	c.Set("Content-Length", strconv.Itoa(len(file)))

	return c.Send(file)
}

func buildAbsensiExcel(absensis []models.Absensi) ([]byte, error) {
	var buffer bytes.Buffer
	zipWriter := zip.NewWriter(&buffer)

	files := map[string]string{
		"[Content_Types].xml":        contentTypesXML(),
		"_rels/.rels":                rootRelsXML(),
		"xl/workbook.xml":            workbookXML(),
		"xl/_rels/workbook.xml.rels": workbookRelsXML(),
		"xl/styles.xml":              stylesXML(),
		"xl/worksheets/sheet1.xml":   worksheetXML(absensis),
		"docProps/core.xml":          coreXML(),
		"docProps/app.xml":           appXML(),
	}

	for name, content := range files {
		writer, err := zipWriter.Create(name)
		if err != nil {
			return nil, err
		}
		if _, err := writer.Write([]byte(content)); err != nil {
			return nil, err
		}
	}

	if err := zipWriter.Close(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func worksheetXML(absensis []models.Absensi) string {
	headers := []string{
		"No",
		// "Absensi ID",
		// "User ID",
		"Nama Lengkap",
		"Email",
		"Status",
		"Absensi Masuk",
		"Absensi Pulang",
		// "Created At",
		// "Updated At",
	}

	var builder bytes.Buffer
	builder.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`)
	builder.WriteString(`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`)
	builder.WriteString(`<cols><col min="1" max="1" width="8" customWidth="1"/><col min="2" max="2" width="40" customWidth="1"/><col min="3" max="3" width="12" customWidth="1"/><col min="4" max="5" width="28" customWidth="1"/><col min="6" max="6" width="16" customWidth="1"/><col min="7" max="10" width="22" customWidth="1"/></cols>`)
	builder.WriteString(`<sheetData>`)

	writeRow(&builder, 1, headers, true)
	for index, absensi := range absensis {
		row := []string{
			strconv.Itoa(index + 1),
			// absensi.AbsensiID,
			// strconv.FormatUint(uint64(absensi.UserID), 10),
			absensi.User.NamaLengkap,
			absensi.User.Email,
			absensi.Status,
			formatExcelTimePtr(absensi.AbsensiMasuk),
			formatExcelTimePtr(absensi.AbsensiPulang),
			// formatExcelTime(absensi.CreatedAt),
			// formatExcelTime(absensi.UpdatedAt),
		}
		writeRow(&builder, index+2, row, false)
	}

	builder.WriteString(`</sheetData>`)
	builder.WriteString(`<autoFilter ref="A1:J` + strconv.Itoa(len(absensis)+1) + `"/>`)
	builder.WriteString(`</worksheet>`)

	return builder.String()
}

func writeRow(builder *bytes.Buffer, rowIndex int, values []string, header bool) {
	builder.WriteString(`<row r="` + strconv.Itoa(rowIndex) + `">`)
	for columnIndex, value := range values {
		cellRef := excelColumnName(columnIndex+1) + strconv.Itoa(rowIndex)
		style := ""
		if header {
			style = ` s="1"`
		}
		builder.WriteString(`<c r="` + cellRef + `"` + style + ` t="inlineStr"><is><t>`)
		xml.EscapeText(builder, []byte(value))
		builder.WriteString(`</t></is></c>`)
	}
	builder.WriteString(`</row>`)
}

func excelColumnName(index int) string {
	column := ""
	for index > 0 {
		index--
		column = string(rune('A'+index%26)) + column
		index /= 26
	}
	return column
}

func formatExcelTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02 15:04:05")
}

func formatExcelTimePtr(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.Format("2006-01-02 15:04:05")
}

func contentTypesXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
	<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
	<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
}

func rootRelsXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

func workbookXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<sheets>
		<sheet name="Absensi" sheetId="1" r:id="rId1"/>
	</sheets>
</workbook>`
}

func workbookRelsXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

func stylesXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
	<fonts count="2">
		<font><sz val="11"/><name val="Calibri"/></font>
		<font><b/><sz val="11"/><name val="Calibri"/></font>
	</fonts>
	<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
	<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
	<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
	<cellXfs count="2">
		<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
		<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
	</cellXfs>
</styleSheet>`
}

func coreXML() string {
	now := time.Now().UTC().Format(time.RFC3339)
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<dc:title>Export Absensi</dc:title>
	<dc:creator>Nasari Absensi API</dc:creator>
	<cp:lastModifiedBy>Nasari Absensi API</cp:lastModifiedBy>
	<dcterms:created xsi:type="dcterms:W3CDTF">` + now + `</dcterms:created>
	<dcterms:modified xsi:type="dcterms:W3CDTF">` + now + `</dcterms:modified>
</cp:coreProperties>`
}

func appXML() string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>Nasari Absensi API</Application>
</Properties>`
}
