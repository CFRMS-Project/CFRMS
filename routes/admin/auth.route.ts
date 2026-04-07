import { Router } from "express";
import * as authController from "../../controllers/authController";

export const authRoutes = Router();

authRoutes.get("/login", authController.showLogin);
authRoutes.post("/login", authController.handleLogin);
authRoutes.get("/logout", authController.handleLogout);
