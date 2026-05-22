import Elysia from "elysia";

export const adminDashboard = new Elysia({})
    .get('/admin/dashboard', () => {
        return {
            success: true,
            message: "Welcome to dashboard admin"
        };
    },{
        detail: {
            tags: ["Admin"],
            summary: "Admin Dashboard"
        }
    })