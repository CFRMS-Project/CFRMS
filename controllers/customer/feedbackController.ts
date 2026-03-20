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
import { StatusEnum } from "@prisma/client";
import prisma from "../../utils/db.js";
import { uploadToCloudinary } from "../../helpers/upToCloudinary.js";

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
      where: { isDeleted: false, status: StatusEnum.APPROVED },
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

    // Render EJS
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
// GET /feedback/new?productId=1
// Hiển thị form đánh giá cho sản phẩm
// -------------------------------------------------------------------
export async function showFeedbackForm(
  req: Request,
  res: Response
): Promise<void> {
  try {
    let productId = Number(req.query["productId"]);
    if (!productId || Number.isNaN(productId) || productId <= 0) {
      const orderId = Number(req.params["id"]);
      productId = Number(orderId || 1); // fallback giả
    }
    if (!productId || Number.isNaN(productId) || productId <= 0) {
      productId = 1;
    }

    const currentUser = res.locals["currentUser"];
    const userId = currentUser?.id || 1;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).send("Người dùng không tồn tại.");
      return;
    }

    res.render("customer/feedback", {
      user,
      mode: "create",
      productId,
      feedback: null,
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị form đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// GET /feedback/:id
// Hiển thị chi tiết 1 feedback
// -------------------------------------------------------------------
export async function showFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = Number(req.params["id"]);
    if (Number.isNaN(feedbackId) || feedbackId <= 0) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true, reviewMedia: true, reply: true },
    });

    if (!feedback) {
      res.status(404).send("Không tìm thấy đánh giá.");
      return;
    }

    res.render("customer/feedback", {
      user: feedback.user,
      mode: "view",
      productId: 1,
      feedback,
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị feedback:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// GET /feedback/:id/edit
// Hiển thị form sửa đánh giá
// -------------------------------------------------------------------
export async function showEditForm(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = Number(req.params["id"]);
    if (Number.isNaN(feedbackId) || feedbackId <= 0) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true, reviewMedia: true },
    });

    if (!feedback) {
      res.status(404).send("Không tìm thấy đánh giá để sửa.");
      return;
    }

    res.render("customer/feedback", {
      user: feedback.user,
      mode: "edit",
      productId: 1,
      feedback,
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị form sửa đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// POST /feedback/:id/update
// Cập nhật đánh giá
// -------------------------------------------------------------------
export async function updateFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = Number(req.params["id"]);
    if (Number.isNaN(feedbackId) || feedbackId <= 0) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const { rating, content, tags, isAnonymous, removedImages } = req.body as {
      rating: string;
      content: string;
      tags: string;
      isAnonymous: string;
      removedImages?: string;
    };

    const ratingNum = Number(rating);
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).send("Rating phải từ 1 đến 5 sao.");
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).send("Vui lòng nhập nội dung đánh giá.");
      return;
    }

    let removedUrls: string[] = [];
    if (removedImages) {
      try {
        const parsed = JSON.parse(removedImages);
        if (Array.isArray(parsed)) {
          removedUrls = parsed.filter((u) => typeof u === "string");
        }
      } catch {
        removedUrls = [];
      }
    }

    const files = req.files as Express.Multer.File[] | undefined;

    // Upload từng ảnh lên Cloudinary, lấy secure_url
    const imagePaths: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadToCloudinary(file.buffer);
        imagePaths.push(url);
      }
    }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        rating: ratingNum,
        content: content.trim(),
        tags: tags || null,
        isAnonymous: isAnonymous === "on" || isAnonymous === "true",
      },
    });

    // Xóa các ảnh bị chỉ định xóa (nếu có)
    if (removedUrls.length > 0) {
      await prisma.reviewMedia.deleteMany({
        where: { feedbackId, url: { in: removedUrls } },
      });
    }

    // Thêm ảnh mới vào (nếu có upload ảnh mới)
    if (imagePaths.length > 0) {
      await prisma.reviewMedia.createMany({
        data: imagePaths.map((url) => ({ url, type: "IMAGE", feedbackId })),
      });
    }

    res.redirect("/customer/history?message=update_success");
  } catch (error) {
    console.error("Lỗi khi cập nhật đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

// -------------------------------------------------------------------
// POST /feedback/:id/toggle-hide
// Ẩn đánh giá
// -------------------------------------------------------------------
export async function toggleHideFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = Number(req.params["id"]);
    if (Number.isNaN(feedbackId) || feedbackId <= 0) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { isDeleted: true },
    });

    res.redirect("/customer/history?message=hide_success");
  } catch (error) {
    console.error("Lỗi khi ẩn đánh giá:", error);
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

    // Lấy userId từ session thực tế
    const currentUser = res.locals["currentUser"];
    const userId = currentUser?.id || 1;

    // --- Bước 2: Upload ảnh lên Cloudinary ---
    const files = req.files as Express.Multer.File[] | undefined;
    const imagePaths: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadToCloudinary(file.buffer);
        imagePaths.push(url);
      }
    }

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
    res.redirect("/customer/history?message=success");
  } catch (error) {
    console.error("Lỗi khi gửi đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi khi gửi đánh giá. Vui lòng thử lại.");
  }
}
