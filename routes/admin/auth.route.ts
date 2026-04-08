import { Router } from "express";
import * as authController from "../../controllers/authController";

export const authRoutes = Router();

authRoutes.get("/login", authController.showAdminLogin);
authRoutes.post("/login", authController.handleAdminLogin);
authRoutes.get("/logout", authController.handleLogout);
