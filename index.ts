/**
 * =============================================================
 * Entry Point: Express Server Configuration
 * =============================================================
 * Cấu hình:
 *   - View Engine: Pug
 *   - Static Files: public/
 *   - Session: express-session
 *   - Routes: Auth, Customer Feedback, Admin
 * =============================================================
 */

import "dotenv/config";
import express from "express";
import session from "express-session";
import path from "path";
import authRoutes from "./routes/authRoutes.js";
import feedbackRoutes from "./routes/customer/feedbackRoutes.js";
import { requireLogin, requireRole } from "./middlewares/auth.js";

const app = express();
const PORT = process.env["PORT"] || 3000;

// --- Cấu hình View Engine ---
app.set("view engine", "pug");
app.set("views", path.join(process.cwd(), "views"));

// --- Cấu hình Static Files ---
app.use(express.static(path.join(process.cwd(), "public")));

// --- Cấu hình Body Parser ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Cấu hình Session ---
app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "shopvn-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true khi dùng HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    },
  })
);

// --- Routes Công khai (không cần đăng nhập) ---
app.use("/", authRoutes);

// Root → redirect /login
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// --- Routes Customer (cần đăng nhập + role CUSTOMER) ---
app.get("/customer/home", requireLogin, (_req, res) => {
  res.render("customer/home");
});

app.get("/customer/history", requireLogin, (_req, res) => {
  res.render("customer/history");
});

// Feedback routes (cần đăng nhập)
app.use("/", requireLogin, feedbackRoutes);

// --- Routes Admin (cần đăng nhập + role ADMIN) ---
app.get("/admin/dashboard", requireRole("ADMIN"), (_req, res) => {
  res.render("admin/dashboard");
});

// --- Khởi động Server ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`Trang đăng nhập: http://localhost:${PORT}/login`);
});
