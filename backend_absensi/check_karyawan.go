//go:build ignore

package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"github.com/joho/godotenv"
	_ "github.com/go-sql-driver/mysql"
)

func main() {
	godotenv.Load()
	dsn := os.Getenv("DSN")
	if dsn == "" {
		dsn = "root:root@tcp(127.0.0.1:3306)/nasari_absensi?charset=utf8mb4&parseTime=True&loc=Local"
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, user_id, nik FROM employes LIMIT 5")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, userId int
		var nik sql.NullString
		if err := rows.Scan(&id, &userId, &nik); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("id: %d, user_id: %d, nik: %s\n", id, userId, nik.String)
	}
}
