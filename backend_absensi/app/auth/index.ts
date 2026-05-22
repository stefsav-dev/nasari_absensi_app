import { Elysia, t } from 'elysia';
import { AuthService } from "./service";
import { jwt } from "@elysia/jwt";
import { bearer } from "@elysia/bearer";
import { prisma } from "../src";

const authService = new AuthService();

export const authRoutes = new Elysia({ 
    tags:["Auth"],
    prefix: '/auth'
})
     .use(
    jwt({
      name: 'jwtAccess',
      secret: process.env.JWT_ACCESS_SECRET!,
      exp: process.env.JWT_ACCESS_EXPIRES || '15m'
    })
  )
  .use(
    jwt({
      name: 'jwtRefresh',
      secret: process.env.JWT_REFRESH_SECRET!,
      exp: process.env.JWT_REFRESH_EXPIRES || '7d'
    })
  )
  .use(bearer())

  // Register User
  .post(
    '/register',
    async ({ body, jwtAccess, jwtRefresh, set }) => {
      try {
        const { user } = await authService.register(body);
        
        // Generate tokens
        const accessToken = await jwtAccess.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });
        
        const refreshToken = await jwtRefresh.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });

        // Save refresh token to database
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken }
        });

        set.status = 201;
        return {
          success: true,
          message: 'User registered successfully',
          data: {
            user,
            tokens: { accessToken, refreshToken },
            role: user.role
          }
        };
      } catch (error: any) {
        set.status = 400;
        return {
          success: false,
          message: error.message
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        nama_lengkap: t.String({ minLength: 2 }),
        photo: t.Optional(t.String())
      }),
      detail: {
        tags: ["Auth"],
        summary: "Register User"
      }
    }
  )


.post(
    '/login',
    async ({ body, jwtAccess, jwtRefresh, set }) => {
      try {
        const { user } = await authService.login(body);
        
        // Generate tokens
        const accessToken = await jwtAccess.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });
        
        const refreshToken = await jwtRefresh.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken }
        });

        return {
          success: true,
          message: 'Login successful',
          data: {
            user,
            tokens: { accessToken, refreshToken }
          }
        };
      } catch (error: any) {
        set.status = 401;
        return {
          success: false,
          message: error.message
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String()
      }),
      detail: {
        tags: ["Auth"],
        summary: "Login user"
      }
    },
  )

  
  .post(
    '/refresh',
    async ({ bearer, jwtAccess, jwtRefresh, set }) => {
      try {
        const refreshToken = bearer;
        if (!refreshToken) {
          throw new Error('Refresh token required');
        }

        // Verify refresh token
        const payload = await jwtRefresh.verify(refreshToken);
        if (!payload || typeof payload === 'string' || !payload.userId) {
          throw new Error('Invalid refresh token');
        }

        // Check if refresh token matches database
        const user = await prisma.user.findUnique({
          where: { id: payload.userId }
        });

        if (!user || user.refreshToken !== refreshToken) {
          throw new Error('Invalid refresh token');
        }

        // Generate new tokens
        const newAccessToken = await jwtAccess.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });
        
        const newRefreshToken = await jwtRefresh.sign({
          userId: user.id,
          email: user.email,
          role: user.role
        });

        // Update refresh token in database
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: newRefreshToken }
        });

        return {
          success: true,
          data: {
            tokens: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken
            }
          },
        };
      } catch (error: any) {
        set.status = 401;
        return {
          success: false,
          message: error.message
        };
      }
    }, {
        detail: {
            tags: ["Auth"],
            summary: "Refresh Token"
        }
    }
)

  // Logout
  .post(
    '/logout',
    async ({ bearer, jwtAccess, set }) => {
      try {
        const token = bearer;
        if (!token) {
          throw new Error('Token required');
        }

        const payload = await jwtAccess.verify(token);
        if (payload && typeof payload !== 'string' && payload.userId) {
          await authService.logout(payload.userId);
        }

        return {
          success: true,
          message: 'Logged out successfully'
        };
      } catch (error: any) {
        set.status = 500;
        return {
          success: false,
          message: error.message
        };
      }
    }, {
        detail: {
            tags: ["Auth"],
            summary: "Logout"
        }
    }
  )

  // Get current user profile
  .get(
    '/me',
    async ({ bearer, jwtAccess, set }) => { 
      try {
        const token = bearer;
        if (!token) {
          throw new Error('Token required');
        }

        const payload = await jwtAccess.verify(token);
        if (!payload || typeof payload === 'string' || !payload.userId) {
          throw new Error('Invalid token');
        }

        const user = await authService.getUserById(payload.userId);
        if (!user) {
          throw new Error('User not found');
        }

        return {
          success: true,
          data: user
        };
      } catch (error: any) {
        set.status = 401;
        return {
          success: false,
          message: error.message
        }
      }
    },
    {
        detail: {
            tags: ["Auth"],
            summary: "Profile Me"
        }
    }
  );