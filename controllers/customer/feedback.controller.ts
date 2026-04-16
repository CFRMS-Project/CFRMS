import type { Request, Response } from "express";
import { StatusEnum } from "@prisma/client";
import prisma from "../../utils/db.js";
import {
  MAX_FEEDBACK_MEDIA_COUNT,
  parsePositiveInt,
  validateFeedbackPayload,
} from "../../utils/validation.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../helpers/upToCloudinary.js";

export function maskName(name: string): string {
  if (!name || name.length <= 2) return "***";
  const first = name.charAt(0);
  const last = name.charAt(name.length - 1);
  return `${first}${"*".repeat(5)}${last}`;
}

export async function showProductDetail(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const productId = parsePositiveInt(req.params["id"]);
    if (!productId) {
      res.status(400).send("ID sản phẩm không hợp lệ.");
      return;
    }

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

    let totalRating = 0;
    const ratingDist = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    } as { 1: number; 2: number; 3: number; 4: number; 5: number };
    const allMedia: { url: string; type: string; feedbackId: number }[] = [];

    for (const feedback of feedbacks) {
      totalRating += feedback.rating;
      if (feedback.rating >= 1 && feedback.rating <= 5) {
        const key = feedback.rating as 1 | 2 | 3 | 4 | 5;
        ratingDist[key]++;
      }

      if (feedback.reviewMedia.length > 0) {
        allMedia.push(
          ...feedback.reviewMedia.map((media) => ({
            url: media.url,
            type: media.type,
            feedbackId: feedback.id,
          }))
        );
      }
    }

    const totalReviews = feedbacks.length;
    const avgRating =
      totalReviews > 0
        ? Number((totalRating / totalReviews).toFixed(1))
        : 0;

    res.render("customer/product", {
      productId,
      feedbacks,
      totalReviews,
      avgRating,
      ratingDist,
      allMedia,
      maskName,
      currentUser: res.locals["currentUser"] || null,
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị chi tiết sản phẩm:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

export async function showFeedbackForm(
  req: Request,
  res: Response
): Promise<void> {
  try {
    let productId = 1;

    if (req.query["productId"] !== undefined) {
      const parsedProductId = parsePositiveInt(req.query["productId"]);
      if (!parsedProductId) {
        res.status(400).send("ID sản phẩm không hợp lệ.");
        return;
      }
      productId = parsedProductId;
    } else if (req.params["id"] !== undefined) {
      const parsedOrderId = parsePositiveInt(req.params["id"]);
      if (!parsedOrderId) {
        res.status(400).send("ID đơn hàng không hợp lệ.");
        return;
      }
      productId = parsedOrderId;
    }

    const currentUser = res.locals["currentUser"];
    if (!currentUser) {
      res.status(401).send("Vui lòng đăng nhập.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });
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

export async function showFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = parsePositiveInt(req.params["id"]);
    if (!feedbackId) {
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

export async function showEditForm(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = parsePositiveInt(req.params["id"]);
    if (!feedbackId) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const currentUser = res.locals["currentUser"];
    if (!currentUser) {
      res.status(401).send("Vui lòng đăng nhập.");
      return;
    }

    const feedback = await prisma.feedback.findFirst({
      where: { id: feedbackId, userId: currentUser.id },
      include: { user: true, reviewMedia: true },
    });

    if (!feedback) {
      res
        .status(404)
        .send("Không tìm thấy đánh giá hoặc bạn không có quyền sửa.");
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

export async function updateFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = parsePositiveInt(req.params["id"]);
    if (!feedbackId) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const currentUser = res.locals["currentUser"];
    if (!currentUser) {
      res.status(401).send("Vui lòng đăng nhập.");
      return;
    }

    const validation = validateFeedbackPayload(req.body as {
      rating?: unknown;
      content?: unknown;
      tags?: unknown;
      isAnonymous?: unknown;
      removedImages?: unknown;
    });
    if (!validation.ok) {
      res.status(400).send(validation.message);
      return;
    }

    const existingFeedback = await prisma.feedback.findFirst({
      where: { id: feedbackId, userId: currentUser.id },
      include: { reviewMedia: true },
    });
    if (!existingFeedback) {
      res
        .status(404)
        .send("Không tìm thấy đánh giá hoặc bạn không có quyền sửa.");
      return;
    }

    const removableUrls = existingFeedback.reviewMedia
      .map((media) => media.url)
      .filter((url) => validation.value.removedUrls.includes(url));
    const files = req.files as Express.Multer.File[] | undefined;
    const remainingMediaCount =
      existingFeedback.reviewMedia.length -
      removableUrls.length +
      (files?.length ?? 0);

    if (remainingMediaCount > MAX_FEEDBACK_MEDIA_COUNT) {
      res
        .status(400)
        .send(`Mỗi đánh giá chỉ được có tối đa ${MAX_FEEDBACK_MEDIA_COUNT} ảnh.`);
      return;
    }

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
        rating: validation.value.rating,
        content: validation.value.content,
        tags: validation.value.tags,
        isAnonymous: validation.value.isAnonymous,
      },
    });

    if (removableUrls.length > 0) {
      await prisma.reviewMedia.deleteMany({
        where: { feedbackId, url: { in: removableUrls } },
      });
      await Promise.all(removableUrls.map((url) => deleteFromCloudinary(url)));
    }

    if (imagePaths.length > 0) {
      await prisma.reviewMedia.createMany({
        data: imagePaths.map((url) => ({
          url,
          type: "IMAGE",
          feedbackId,
        })),
      });
    }

    res.redirect("/customer/history?message=update_success");
  } catch (error) {
    console.error("Lỗi khi cập nhật đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

export async function toggleHideFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const feedbackId = parsePositiveInt(req.params["id"]);
    if (!feedbackId) {
      res.status(400).send("ID đánh giá không hợp lệ.");
      return;
    }

    const currentUser = res.locals["currentUser"];
    if (!currentUser) {
      res.status(401).send("Vui lòng đăng nhập.");
      return;
    }

    const updated = await prisma.feedback.updateMany({
      where: { id: feedbackId, userId: currentUser.id },
      data: { isDeleted: true },
    });

    if (updated.count === 0) {
      res.status(403).send("Bạn không có quyền ẩn đánh giá này.");
      return;
    }

    res.redirect("/customer/history?message=hide_success");
  } catch (error) {
    console.error("Lỗi khi ẩn đánh giá:", error);
    res.status(500).send("Đã xảy ra lỗi. Vui lòng thử lại.");
  }
}

export async function submitFeedback(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const currentUser = res.locals["currentUser"];
    if (!currentUser) {
      res.status(401).send("Vui lòng đăng nhập.");
      return;
    }

    const validation = validateFeedbackPayload(req.body as {
      rating?: unknown;
      content?: unknown;
      tags?: unknown;
      isAnonymous?: unknown;
      removedImages?: unknown;
    });
    if (!validation.ok) {
      res.status(400).send(validation.message);
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const imagePaths: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadToCloudinary(file.buffer);
        imagePaths.push(url);
      }
    }

    await prisma.feedback.create({
      data: {
        rating: validation.value.rating,
        content: validation.value.content,
        tags: validation.value.tags,
        isAnonymous: validation.value.isAnonymous,
        user: {
          connect: { id: currentUser.id },
        },
        reviewMedia: {
          create: imagePaths.map((url) => ({
            url,
            type: "IMAGE" as const,
          })),
        },
      },
    });

    res.redirect("/customer/history?message=success");
  } catch (error) {
    console.error("Lỗi khi gửi đánh giá:", error);
    res
      .status(500)
      .send("Đã xảy ra lỗi khi gửi đánh giá. Vui lòng thử lại.");
  }
}
