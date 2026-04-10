/**
 * =============================================================
 * Middleware: Multer Upload Configuration (Cloudinary)
 * =============================================================
 * Mục đích: Xử lý việc upload hình ảnh cho tính năng đánh giá.
 * - Dùng memoryStorage: file giữ trong RAM (req.files[i].buffer)
 * - Controller sẽ upload buffer lên Cloudinary
 * - Chỉ cho phép các định dạng ảnh: jpg, jpeg, png
 * - Giới hạn: tối đa 5 ảnh, mỗi ảnh tối đa 10MB
 * =============================================================
 */

import multer from "multer";

// --- Dùng memoryStorage thay diskStorage ---
// File được giữ trong RAM dưới dạng Buffer
// Controller sẽ gọi uploadToCloudinary(file.buffer)
const storage = multer.memoryStorage();

// --- Bộ lọc File (File Filter) ---
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "video/mp4",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ cho phép upload file ảnh (jpg, jpeg, png) hoặc video (mp4, webm)!"));
  }
};

// --- Export Middleware ---
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB mỗi file
  },
});

// Middleware cho route POST /feedback và POST /feedback/:id/update
export const uploadReviewImages = upload.array("images", 5);
