/**
 * =============================================================
 * Entry Point: Express Server Configuration
 * =============================================================
 * Mục đích: Khởi tạo và cấu hình Express server cho CFRMS.
 *
 * Cấu hình:
 *   - View Engine: EJS (render file .ejs trong thư mục views/)
 *   - Static Files: Phục vụ từ thư mục public/
 *   - Body Parser: Xử lý form data (urlencoded)
 *   - Routes: Mount feedback routes cho khách hàng
 *
 * Cổng mặc định: 3000 (cấu hình trong .env)
 * =============================================================
 */

import "dotenv/config";
import express from "express";
import path from "path";
import feedbackRoutes from "./routes/customer/feedbackRoutes.js";

const app = express();
const PORT = process.env["PORT"] || 3000;

// --- Cấu hình View Engine ---
// Sử dụng EJS để render các file .ejs trong thư mục views/
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// --- Cấu hình Static Files ---
// Phục vụ các file tĩnh (CSS, JS, images, uploads) từ thư mục public/
app.use(express.static(path.join(process.cwd(), "public")));

// --- Cấu hình Body Parser ---
// Xử lý dữ liệu form POST (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Mount Routes ---
// Gắn các route cho tính năng đánh giá của khách hàng
app.use("/", feedbackRoutes);

// --- Khởi động Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📝 Form đánh giá: http://localhost:${PORT}/order/1/feedback`);
});
