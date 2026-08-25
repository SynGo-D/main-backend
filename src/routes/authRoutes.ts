import { Router } from "express";
import { AuthController } from "../controllers/AuthController";

export function createAuthRoutes(authController: AuthController) {

    const router = Router();

    // POST /api/auth/login
    router.post(
        "/login",
        (req, res) => authController.login(req, res)
    );

    return router;
}
