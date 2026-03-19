/**
 * =============================================================
 * Controller: Customer Feedback (Đánh giá sản phẩm)
 * =============================================================
 * Mục đích: Xử lý nghiệp vụ cho tính năng đánh giá sản phẩm.
 *
 * Chức năng:
 *   1. showFeedbackForm  - Hiển thị form viết đánh giá
 *   2. submitFeedback    - Xử lý gửi đánh giá + lưu vào DB
 *   3. maskName          - Ẩn tên khách hàng khi đánh giá ẩn danh
 *
 * Quy trình:
 *   Khách hàng → GET /order/:id/feedback → Hiển thị form
 *   Khách hàng → POST /feedback → Multer xử lý ảnh → Controller lưu DB
 * =============================================================
 */

import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
//import { PrismaClient } from "@prisma/client";

//const prisma = new PrismaClient();
import prisma from "../../utils/db.js";

// -------------------------------------------------------------------
// Utility: Ẩn tên khách hàng cho đánh giá ẩn danh
// Ví dụ: "Nguyễn Việt Hiếu" → "N*****u"
// -------------------------------------------------------------------
export function maskName(name: string): string {
  if (!name || name.length <= 2) return "***";
  const first = name.charAt(0);
  const last = name.charAt(name.length - 1);
  return `${first}${"*".repeat(5)}${last}`;
}

// -------------------------------------------------------------------
// GET /product/:id
// Hiển thị trang chi tiết sản phẩm và danh sách đánh giá
// -------------------------------------------------------------------
export async function showProductDetail(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const productId = req.params["id"]; // Dùng để tham khảo nếu có DB Product sau này

    // Lấy toàn bộ danh sách feedback từ DB, bao gồm User, Media, Reply
    // Sắp xếp mới nhất lên đầu
    const feedbacks = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        reviewMedia: true,
        reply: {
          include: { admin: true },
        },
      },
    });

    // Thống kê sao
    let totalRating = 0;
    const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as { 1: number; 2: number; 3: number; 4: number; 5: number };
    
    // Thu thập tất cả ảnh từ cộng đồng
    const allMedia: { url: string; type: string; feedbackId: number }[] = [];

    for (const fb of feedbacks) {
      totalRating += fb.rating;
      if (fb.rating >= 1 && fb.rating <= 5) {
        const key = fb.rating as 1 | 2 | 3 | 4 | 5;
        ratingDist[key]++;
      }
      if (fb.reviewMedia && fb.reviewMedia.length > 0) {
        allMedia.push(...fb.reviewMedia.map(m => ({ url: m.url, type: m.type, feedbackId: fb.id })));
      }
    }

    const totalReviews = feedbacks.length;
    let avgRating = 0;
    if (totalReviews > 0) {
      avgRating = Number((totalRating / totalReviews).toFixed(1));
    }

    // Render Pug
    res.render("customer/product", {
      productId,
      feedbacks,
      totalReviews,
      avgRating,
      ratingDist,
      allMedia,
      maskName, // Truyền utility function vào view
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị chi tiết sản phẩm:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// GET /order/:id/feedback
// Hiển thị form đánh giá cho một đơn hàng cụ thể
// -------------------------------------------------------------------
export async function showFeedbackForm(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const idParam = req.params["id"];
    const feedbackId = parseInt(String(idParam), 10) || 0;

    // TODO: Lấy userId từ session thực tế khi có authentication
    // Tạm thời hardcode userId = 1 để demo
    const userId = 1;

    // Kiểm tra: Feedback đã tồn tại cho user này chưa?
    // Đảm bảo mỗi user chỉ đánh giá một lần
    const existingFeedback = await prisma.feedback.findFirst({
      where: {
        userId: userId,
        id: feedbackId,
      },
    });

    if (existingFeedback) {
      // Đã đánh giá rồi → redirect về lịch sử
      res.redirect("/history?message=already_reviewed");
      return;
    }

    // Lấy thông tin user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Render form đánh giá với dữ liệu
    const viewRoot = req.app.get('views');
    const viewTest = path.join(String(viewRoot), 'customer', 'feedback.pug');
    console.log('DEBUG: view root', viewRoot, 'exists', fs.existsSync(viewTest), 'viewTest', viewTest);
    res.render("customer/feedback", {
      user,
      feedbackId,
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị form đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// POST /feedback
// Xử lý dữ liệu từ form đánh giá và lưu vào PostgreSQL
// -------------------------------------------------------------------
export async function submitFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // --- Bước 1: Trích xuất dữ liệu từ req.body ---
    const {
      rating,
      content,
      tags,
      isAnonymous,
    } = req.body as {
      rating: string;
      content: string;
      tags: string;
      isAnonymous: string;
    };

    // TODO: Lấy userId từ session thực tế
    const userId = 1;

    // --- Bước 2: Xử lý mảng ảnh từ req.files ---
    // Multer đã xử lý upload, ta chỉ cần lấy đường dẫn
    const files = req.files as Express.Multer.File[] | undefined;
    const imagePaths =
      files?.map((file) => `/uploads/reviews/${file.filename}`) ?? [];

    // --- Bước 3: Validate dữ liệu đầu vào ---
    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).send("Rating phải từ 1 đến 5 sao.");
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).send("Vui lòng nhập nội dung đánh giá.");
      return;
    }

    if (content.length > 500) {
      res.status(400).send("Nội dung đánh giá không được quá 500 ký tự.");
      return;
    }

    // --- Bước 4: Prisma Nested Write (Transaction tự động) ---
    // Tạo Feedback + ReviewMedia trong 1 lần ghi đảm bảo đồng bộ
    await prisma.feedback.create({
      data: {
        rating: ratingNum,
        content: content.trim(),
        tags: tags || null, // Chuỗi tags như "Giao nhanh, Đóng gói kỹ"
        isAnonymous: isAnonymous === "on" || isAnonymous === "true",

        // Liên kết với User
        user: {
          connect: { id: userId },
        },

        // Nested Write: Tạo ReviewMedia cho mỗi ảnh đã upload
        reviewMedia: {
          create: imagePaths.map((url) => ({
            url,
            type: "IMAGE" as const,
          })),
        },
      },
    });

    // --- Bước 5: Redirect về trang lịch sử với thông báo thành công ---
    res.redirect("/history?message=success");
  } catch (error) {
    console.error("Lỗi khi gửi đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi khi gửi đánh giá. Vui lòng thử lại.");
  }
}
