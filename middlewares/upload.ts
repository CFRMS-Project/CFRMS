/**
 * =============================================================
 * Middleware: Multer Upload Configuration
 * =============================================================
 * Mục đích: Xử lý việc upload hình ảnh cho tính năng đánh giá.
 * - Lưu trữ file vào thư mục public/uploads/reviews/
 * - Đặt tên file: feedback-<timestamp>-<tên gốc> để tránh trùng
 * - Chỉ cho phép các định dạng ảnh: jpg, jpeg, png
 * - Giới hạn: tối đa 5 ảnh, mỗi ảnh tối đa 5MB
 * =============================================================
 */

import multer from "multer";
import path from "path";

// --- Cấu hình Storage ---
// Định nghĩa nơi lưu file và cách đặt tên file
const storage = multer.diskStorage({
  // Thư mục đích: public/uploads/reviews/
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "public", "uploads", "reviews"));
  },

  // Đặt tên file: feedback-<timestamp>-<tên gốc>
  // Ví dụ: feedback-1710856200000-photo.jpg
  filename: (_req, file, cb) => {
    const uniqueName = `feedback-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// --- Bộ lọc File (File Filter) ---
// Chỉ cho phép upload các file ảnh có định dạng phổ biến
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Cho phép upload
  } else {
    cb(new Error("Chỉ cho phép upload file ảnh (jpg, jpeg, png)!"));
  }
};

// --- Export Middleware ---
// upload.array("images", 5) : cho phép tối đa 5 file với field name = "images"
// limits.fileSize = 5MB     : giới hạn dung lượng mỗi file
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB mỗi ảnh
  },
});

// Middleware cho route POST /feedback
// Sử dụng: router.post("/feedback", uploadReviewImages, controller)
export const uploadReviewImages = upload.array("images", 5);
