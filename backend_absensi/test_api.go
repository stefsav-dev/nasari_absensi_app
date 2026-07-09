package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{Transport: tr}

	loginPayload := map[string]string{
		"username": "admin",
		"password": "54fcc26a58e14a6f5efc9b79ed784dad",
	}
	loginBytes, _ := json.Marshal(loginPayload)

	loginResp, err := client.Post("https://116.254.117.243/api-absensi/api/login.php", "application/json", bytes.NewBuffer(loginBytes))
	if err != nil {
		fmt.Println("Error login:", err)
		return
	}
	defer loginResp.Body.Close()

	var authRes struct {
		Data struct {
			Token string `json:"token"`
		} `json:"data"`
	}
	json.NewDecoder(loginResp.Body).Decode(&authRes)

	req, _ := http.NewRequest("GET", "https://116.254.117.243/api-absensi/api/", nil)
	req.Header.Add("Authorization", "Bearer "+authRes.Data.Token)

	resp, _ := client.Do(req)
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body[:300]))
}
