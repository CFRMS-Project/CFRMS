/**
 * =============================================================
 * Middleware: Multer Upload Configuration (Cloudinary)
 * =============================================================
 * Mục đích: Xử lý upload ảnh cho tính năng đánh giá.
 * - Dùng memoryStorage: file giữ trong RAM (req.files[i].buffer)
 * - Controller sẽ upload buffer lên Cloudinary
 * - Chỉ cho phép ảnh JPG, JPEG, PNG
 * - Giới hạn: tối đa 5 ảnh, mỗi ảnh tối đa 10MB
 * =============================================================
 */

import type { RequestHandler } from "express";
import multer from "multer";
import {
  MAX_FEEDBACK_MEDIA_COUNT,
  MAX_FEEDBACK_MEDIA_SIZE_BYTES,
} from "../utils/validation.js";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Chỉ cho phép upload ảnh JPG, JPEG hoặc PNG."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: MAX_FEEDBACK_MEDIA_COUNT,
    fileSize: MAX_FEEDBACK_MEDIA_SIZE_BYTES,
  },
});

const uploadReviewImagesMiddleware = upload.array(
  "images",
  MAX_FEEDBACK_MEDIA_COUNT
);

export const uploadReviewImages: RequestHandler = (req, res, next) => {
  uploadReviewImagesMiddleware(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).send("Mỗi ảnh tải lên không được vượt quá 10MB.");
        return;
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        res
          .status(400)
          .send(`Chỉ được tải lên tối đa ${MAX_FEEDBACK_MEDIA_COUNT} ảnh.`);
        return;
      }

      res.status(400).send("Tệp tải lên không hợp lệ.");
      return;
    }

    if (error) {
      res.status(400).send(error.message);
      return;
    }

    next();
  });
};
