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
import { requireLogin } from "../../middlewares/auth";
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

// --- PUBLIC GET: Hiển thị trang chi tiết sản phẩm ---
router.get("/product/:id", showProductDetail);

// --- PROTECTED GET: Hiển thị form đánh giá (tạo mới) ---
router.get("/new", requireLogin, showFeedbackForm);
router.get("/order/:id/feedback", requireLogin, showFeedbackForm);

// --- PROTECTED POST: Xử lý gửi đánh giá (mới) ---
router.post("/", requireLogin, uploadReviewImages, submitFeedback);

// --- PROTECTED GET: Xem chi tiết 1 đánh giá ---
router.get("/:id", requireLogin, showFeedback);

// --- PROTECTED GET: Hiển thị form đánh giá (sửa) ---
router.get("/:id/edit", requireLogin, showEditForm);

// --- PROTECTED POST: Cập nhật đánh giá ---
router.post("/:id/update", requireLogin, uploadReviewImages, updateFeedback);

// --- PROTECTED POST: Ẩn đánh giá ---
router.post("/:id/toggle-hide", requireLogin, toggleHideFeedback);

export const feedbackRoutes: Router = router;
