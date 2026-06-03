package handler

import (
	"encoding/json"
	"log"
)

func BuildSwaggerSpec(port string) []byte {
	spec := map[string]any{
		"openapi": "3.0.3",
		"info": map[string]any{
			"title":   "Nasari Absensi API",
			"version": "1.0.0",
		},
		"tags": []map[string]string{
			{
				"name":        "Auth",
				"description": "Authentication routes",
			},
			{
				"name":        "User",
				"description": "Authenticated user routes",
			},
			{
				"name":        "Pegawai",
				"description": "Pegawai dashboard routes",
			},
			{
				"name":        "Admin",
				"description": "Admin dashboard routes",
			},
			{
				"name":        "Superadmin",
				"description": "Superadmin dashboard routes",
			},
			{
				"name":        "Root",
				"description": "Root API route",
			},
		},
		"servers": []map[string]string{
			{
				"url":         "http://localhost:" + port,
				"description": "Local development server",
			},
		},
		"components": map[string]any{
			"securitySchemes": map[string]any{
				"bearerAuth": map[string]any{
					"type":         "http",
					"scheme":       "bearer",
					"bearerFormat": "JWT",
				},
			},
		},
		"paths": map[string]map[string]map[string]any{
			"/": {
				"get": swaggerOperation("Root", "Welcome endpoint"),
			},
			"/api/login": {
				"post": swaggerOperation("Auth", "Login user", requestBody(
					"Login credentials",
					map[string]any{
						"email":    stringSchema("admin@nasari.test"),
						"password": stringSchema("admin123"),
					},
					[]string{"email", "password"},
				)),
			},
			"/api/register": {
				"post": swaggerOperation("Auth", "Register user", requestBody(
					"Register user data",
					map[string]any{
						"email":    stringSchema("user@example.com"),
						"password": stringSchema("password123"),
						"name":     stringSchema("John Doe"),
						"role": map[string]any{
							"type":    "string",
							"example": "pegawai",
							"enum":    []string{"superadmin", "admin", "pegawai"},
						},
					},
					[]string{"email", "password", "name", "role"},
				)),
			},
			"/api/refresh-token": {
				"post": swaggerOperation("Auth", "Refresh access token", requestBody(
					"Refresh token data",
					map[string]any{
						"refresh_token": stringSchema("refresh-token"),
					},
					[]string{"refresh_token"},
				)),
			},
			"/api/protected/profile": {
				"get": authenticatedSwaggerOperation("User", "Get authenticated user profile"),
			},
			"/api/protected/logout": {
				"post": authenticatedSwaggerOperation("Auth", "Logout user"),
			},
			"/api/protected/admin/dashboard": {
				"get": authenticatedSwaggerOperation("Admin", "Admin dashboard"),
			},
			"/api/protected/superadmin/dashboard": {
				"get": authenticatedSwaggerOperation("Superadmin", "Superadmin dashboard"),
			},
			"/api/protected/pegawai/dashboard": {
				"get": authenticatedSwaggerOperation("Pegawai", "Pegawai dashboard"),
			},
		},
	}

	content, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		log.Fatalf("failed to build swagger spec: %v", err)
	}

	return content
}

func swaggerOperation(tag string, summary string, body ...map[string]any) map[string]any {
	operation := map[string]any{
		"tags":    []string{tag},
		"summary": summary,
		"responses": map[string]any{
			"200": map[string]any{
				"description": "Successful response",
			},
		},
	}

	if len(body) > 0 {
		operation["requestBody"] = body[0]
	}

	return operation
}

func authenticatedSwaggerOperation(tag string, summary string, body ...map[string]any) map[string]any {
	operation := swaggerOperation(tag, summary, body...)
	operation["security"] = []map[string][]string{
		{
			"bearerAuth": {},
		},
	}

	return operation
}

func requestBody(description string, properties map[string]any, required []string) map[string]any {
	return map[string]any{
		"description": description,
		"required":    true,
		"content": map[string]any{
			"application/json": map[string]any{
				"schema": map[string]any{
					"type":       "object",
					"properties": properties,
					"required":   required,
				},
			},
		},
	}
}

func stringSchema(example string) map[string]any {
	return map[string]any{
		"type":    "string",
		"example": example,
	}
}
