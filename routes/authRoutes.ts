/**
 * =============================================================
 * Auth Routes: Định tuyến Đăng nhập / Đăng xuất
 * =============================================================
 */

import { Router } from "express";
import { showLogin, handleLogin, handleLogout } from "../controllers/authController.js";

const router = Router();

// GET  /login  → Hiển thị trang đăng nhập
router.get("/login", showLogin);

// POST /login  → Xử lý form đăng nhập
router.post("/login", handleLogin);

// GET  /logout → Đăng xuất
router.get("/logout", handleLogout);

export default router;
