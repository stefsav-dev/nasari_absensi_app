package middleware

import (
	"backend_absensi/config"
	"backend_absensi/utils"
	"context"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func AuthMiddleware(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Missing authorization token")
		}

		// Check Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid authorization format. Use Bearer token")
		}

		tokenString := parts[1]

		// Check if token is blacklisted in Redis
		redisClient, ok := c.Locals("redis").(*redis.Client)
		if ok && redisClient != nil {
			ctx := context.Background()
			exists, err := redisClient.Exists(ctx, "blacklist:"+tokenString).Result()
			if err == nil && exists > 0 {
				return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Token has been revoked")
			}
		}

		// Verify token
		claims, err := config.JWTAuth.VerifyAccessToken(tokenString)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid or expired token")
		}

		// Check role if specified
		if len(allowedRoles) > 0 {
			roleAllowed := false
			for _, role := range allowedRoles {
				if claims.Role == role {
					roleAllowed = true
					break
				}
			}
			fmt.Printf("claims.Role: %v, allowedRoles: %v\n", claims.Role, allowedRoles)
			if !roleAllowed {
				return utils.ErrorResponse(c, fiber.StatusForbidden, "Access denied. Insufficient permissions")
			}
		}

		// Store user info in context
		c.Locals("user", claims)
		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.Role)

		return c.Next()
	}
}
