import Elysia from "elysia";

export const userDashboard = new Elysia({})
    .get("/user/dashboard", () => {
        return {
        success: true,
        message: "Welcome to user dashboard"
        }
    },{
        detail: {
            tags: ["User"], 
            summary: "User Dashboard"
        }
    })