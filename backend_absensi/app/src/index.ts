import { Elysia } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { cors } from '@elysia/cors';
import { authRoutes } from '../auth';
import { openapi } from '@elysia/openapi';
import { adminDashboard } from '../admin/dashboard';
import { userDashboard } from '../user/dashboard';

export const prisma = new PrismaClient()

const app = new Elysia()
  .use(openapi())
  .use(cors())
  .use(authRoutes)

  .get("/", () => {
    return {
      success: true,
      message: 'Absensi Routing',
      version: 'v1.0.0'
    }
  },{
    detail: {
      summary: "Testing Route"
    }
  })

  // admin routes
  .use(adminDashboard)
  // user routes
  .use(userDashboard)

  .listen(5000);

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);