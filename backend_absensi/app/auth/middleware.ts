import { bearer } from "@elysia/bearer";
import { jwt } from "@elysia/jwt";
import Elysia from "elysia";
import { prisma } from "../src";

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
if (!jwtAccessSecret) {
    throw new Error("Missing JWT ACCESS SECRET");
}

export const authMiddleware = new Elysia()
    .use(
        jwt({
            name: "jwtAccess",
            secret: jwtAccessSecret,
        })
    )
    .use(bearer())
    .derive(async ({ jwtAccess, bearer, set}) => {
        const token = bearer;

        if (!token) {
            set.status = 401;
            throw new Error("No token provided");
        }

        const payload = await jwtAccess.verify(token);

        if (!payload || typeof payload === "string") {
            set.status = 401;
            throw new Error("Invalid token");
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId}
        });

        if (!user) {
            set.status = 401;
            throw new Error("User not found");
        }

        return {
            user: {
                userId: user.id,
                email: user.email,
                role: user.role,
                nama_lengkap: user.nama_lengkap
            }
        };
    });

    export const adminOnly = new Elysia()
        .use(authMiddleware)
        .derive(({ user, set}) => {
            if (user.role !== "ADMIN") {
                set.status = 403
                throw new Error("Access denied. Admin Only");
            }
            return {user};
        });

    export const userOnly = new Elysia()
        .use(authMiddleware)
        .derive(({ user, set}) => {
            if (user.role !== "USER") {
                set.status = 403
                throw new Error("Access denied. User Only");
            }
            return { user }
        })

    export const authenticatedOnly = new Elysia()
        .use(authMiddleware)