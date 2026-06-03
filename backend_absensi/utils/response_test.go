package utils

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestSuccessResponse(t *testing.T) {
	app := fiber.New()

	app.Get("/test-success", func(c *fiber.Ctx) error {
		data := map[string]string{"message": "Hello World"}
		return SuccessResponse(c, data)
	})

	req := httptest.NewRequest("GET", "/test-success", nil)
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)

	var responseBody Response
	json.NewDecoder(resp.Body).Decode(&responseBody)

	assert.True(t, responseBody.Success)
	assert.Equal(t, "", responseBody.Error)

	// Since data is map[string]interface{} when decoded from JSON
	dataMap, ok := responseBody.Data.(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "Hello World", dataMap["message"])
}

func TestErrorResponse(t *testing.T) {
	app := fiber.New()

	app.Get("/test-error", func(c *fiber.Ctx) error {
		return ErrorResponse(c, fiber.StatusBadRequest, "Invalid input")
	})

	req := httptest.NewRequest("GET", "/test-error", nil)
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, resp.StatusCode)

	var responseBody Response
	json.NewDecoder(resp.Body).Decode(&responseBody)

	assert.False(t, responseBody.Success)
	assert.Equal(t, "Invalid input", responseBody.Error)
	assert.Nil(t, responseBody.Data)
}
