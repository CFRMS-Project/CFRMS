/**
 * =============================================================
 * Routes: Customer Feedback (Đánh giá sản phẩm)
 * =============================================================
 * Mục đích: Định nghĩa các endpoint cho tính năng đánh giá.
 *
 * Endpoints:
 *   GET  /order/:id/feedback  → Hiển thị form đánh giá
 *   POST /feedback            → Gửi đánh giá (qua Multer middleware)
 *
 * Luồng xử lý:
 *   Request → Route → [Multer Middleware] → Controller → Response
 * =============================================================
 */

import { Router } from "express";
import { uploadReviewImages } from "../../middlewares/upload.js";
import {
  showFeedbackForm,
  submitFeedback,
} from "../../controllers/customer/feedbackController.js";

const router = Router();

// --- GET: Hiển thị form đánh giá ---
// URL: /order/:id/feedback
// Ví dụ: /order/1/feedback → hiển thị form cho đơn hàng #1
router.get("/order/:id/feedback", showFeedbackForm);

// --- POST: Xử lý gửi đánh giá ---
// Luồng: Form submit → Multer xử lý file upload → Controller lưu DB
// uploadReviewImages: middleware Multer cho phép tối đa 5 ảnh
router.post("/feedback", uploadReviewImages, submitFeedback);

export default router;
