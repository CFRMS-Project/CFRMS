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
import { uploadReviewImages } from "../../middlewares/upload";
import {
  showFeedbackForm,
  submitFeedback,
  showProductDetail,
  showFeedback,
  showEditForm,
  updateFeedback,
  toggleHideFeedback,
} from "../../controllers/customer/feedback.controller";

const router: Router = Router();

// --- GET: Hiển thị trang chi tiết sản phẩm ---
router.get("/product/:id", showProductDetail);

// --- GET: Hiển thị form đánh giá (tạo mới) ---
router.get("/new", showFeedbackForm);
router.get("/order/:id/feedback", showFeedbackForm);

// --- POST: Xử lý gửi đánh giá (mới) ---
router.post("/", uploadReviewImages, submitFeedback);

// --- GET: Xem chi tiết 1 đánh giá ---
router.get("/:id", showFeedback);

// --- GET: Hiển thị form đánh giá (sửa) ---
router.get("/:id/edit", showEditForm);

// --- POST: Cập nhật đánh giá ---
router.post("/:id/update", uploadReviewImages, updateFeedback);

// --- POST: Ẩn đánh giá ---
router.post("/:id/toggle-hide", toggleHideFeedback);

export const feedbackRoutes: Router = router;
