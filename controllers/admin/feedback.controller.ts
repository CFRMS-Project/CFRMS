import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient, StatusEnum } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  buildPaginationMeta,
  parsePagination,
} from "../../utils/pagination.utils.js";
import {
  normalizeFeedbackStatus,
  parsePositiveInt,
  validateBulkIds,
  validateReplyContent,
} from "../../utils/validation.js";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const statusMap: Record<string, StatusEnum | undefined> = {
  pending: StatusEnum.PENDING,
  approved: StatusEnum.APPROVED,
  rejected: StatusEnum.REJECTED,
  all: undefined,
};

const buildWhereBase = (q: string, selectedStatus?: StatusEnum) => ({
  isDeleted: false,
  ...(selectedStatus ? { status: selectedStatus } : {}),
  ...(q
    ? {
        OR: [
          { content: { contains: q, mode: "insensitive" as const } },
          { tags: { contains: q, mode: "insensitive" as const } },
          { user: { is: { name: { contains: q, mode: "insensitive" as const } } } },
          {
            user: {
              is: {
                username: { contains: q, mode: "insensitive" as const },
              },
            },
          },
        ],
      }
    : {}),
});

export const index = async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  const tab = String(req.query.tab || "pending");
  const sort = String(req.query.sort || "desc");
  const { page, limit, skip } = parsePagination({
    pageQuery: req.query.page,
    defaultLimit: 10,
  });

  const normalizedTab = Object.prototype.hasOwnProperty.call(statusMap, tab)
    ? tab
    : "pending";
  const selectedStatus = statusMap[normalizedTab];
  const whereBase = buildWhereBase(q, selectedStatus);

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);

  const orderByDirection = sort === "asc" ? "asc" : "desc";

  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    allCount,
    approvedTodayCount,
    totalCount,
    rows,
  ] = await Promise.all([
    prisma.feedback.count({
      where: { isDeleted: false, status: StatusEnum.PENDING },
    }),
    prisma.feedback.count({
      where: { isDeleted: false, status: StatusEnum.APPROVED },
    }),
    prisma.feedback.count({
      where: { isDeleted: false, status: StatusEnum.REJECTED },
    }),
    prisma.feedback.count({ where: { isDeleted: false } }),
    prisma.feedback.count({
      where: {
        isDeleted: false,
        status: StatusEnum.APPROVED,
        updatedAt: { gte: startToday, lte: endToday },
      },
    }),
    prisma.feedback.count({ where: whereBase }),
    prisma.feedback.findMany({
      where: whereBase,
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
        reviewMedia: { take: 5, orderBy: { id: "asc" } },
        reply: true,
      },
      orderBy: { createdAt: orderByDirection },
      skip,
      take: limit,
    }),
  ]);

  const violationRate = allCount ? (rejectedCount / allCount) * 100 : 0;
  const paginationMeta = buildPaginationMeta(totalCount, page, limit);

  res.render("admin/pages/feedbacks/index", {
    pageTitle: "Danh sách phản hồi",
    stats: { pendingCount, approvedTodayCount, violationRate },
    tabCounts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      all: allCount,
    },
    filters: { q, tab: normalizedTab, sort, page: paginationMeta.page, limit },
    pagination: paginationMeta,
    feedbacks: rows,
  });
};

export const detail = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res
        .status(400)
        .json({ code: 400, message: "ID đánh giá không hợp lệ" });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
        reviewMedia: true,
        reply: true,
      },
    });

    if (!feedback) {
      return res
        .status(404)
        .json({ code: 404, message: "Không tìm thấy đánh giá" });
    }

    res.json({
      code: 200,
      data: {
        ...feedback,
        product: {
          name: "Nhẫn Kim Cương Luxury Elite",
          fakePrice: "250.000.000đ",
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const changeStatus = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const status = normalizeFeedbackStatus(req.params.status);
    const replyValidation = validateReplyContent(req.body?.reply);
    const currentAdmin = res.locals["currentUser"];

    if (!id || !status) {
      return res
        .status(400)
        .json({ code: 400, message: "Dữ liệu không hợp lệ" });
    }

    if (!replyValidation.ok) {
      return res
        .status(400)
        .json({ code: 400, message: replyValidation.message });
    }

    if (!currentAdmin?.id) {
      return res.status(401).json({ code: 401, message: "Chưa đăng nhập" });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!feedback) {
      return res
        .status(404)
        .json({ code: 404, message: "Không tìm thấy đánh giá" });
    }

    await prisma.feedback.update({
      where: { id },
      data: { status },
    });

    if (replyValidation.value !== "") {
      await prisma.reply.upsert({
        where: { feedbackId: id },
        update: {
          content: replyValidation.value,
          adminId: currentAdmin.id,
        },
        create: {
          content: replyValidation.value,
          feedbackId: id,
          adminId: currentAdmin.id,
        },
      });
    }

    res.json({ code: 200, message: "Cập nhật trạng thái thành công" });
  } catch (error) {
    console.error("Error changeStatus:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const changeMulti = async (req: Request, res: Response) => {
  try {
    const action =
      typeof req.body?.action === "string" ? req.body.action.trim() : "";
    const idsValidation = validateBulkIds(req.body?.ids);

    if (!idsValidation.ok) {
      return res
        .status(400)
        .json({ code: 400, message: idsValidation.message });
    }

    if (action === "approve") {
      await prisma.feedback.updateMany({
        where: { id: { in: idsValidation.value } },
        data: { status: StatusEnum.APPROVED },
      });
    } else if (action === "delete") {
      await prisma.feedback.updateMany({
        where: { id: { in: idsValidation.value } },
        data: { isDeleted: true },
      });
    } else {
      return res
        .status(400)
        .json({ code: 400, message: "Hành động không được hỗ trợ" });
    }

    res.json({ code: 200, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Error changeMulti:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      return res.status(400).json({ code: 400, message: "ID không hợp lệ" });
    }

    const updated = await prisma.feedback.updateMany({
      where: { id },
      data: { isDeleted: true },
    });

    if (updated.count === 0) {
      return res
        .status(404)
        .json({ code: 404, message: "Không tìm thấy đánh giá" });
    }

    res.json({ code: 200, message: "Xóa thành công!" });
  } catch (error) {
    console.error("Error deleteItem:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const exportCsv = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const tab = String(req.query.tab || "all");
    const sort = String(req.query.sort || "desc");

    const normalizedTab = Object.prototype.hasOwnProperty.call(statusMap, tab)
      ? tab
      : "all";
    const selectedStatus = statusMap[normalizedTab];
    const whereBase = buildWhereBase(q, selectedStatus);
    const orderByDirection = sort === "asc" ? "asc" : "desc";

    const rows = await prisma.feedback.findMany({
      where: whereBase,
      include: {
        user: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: orderByDirection },
    });

    const escape = (value: unknown): string => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const statusLabel: Record<string, string> = {
      PENDING: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      REJECTED: "Bị từ chối",
    };

    const header = [
      "ID",
      "Khách hàng",
      "Username",
      "Nội dung",
      "Số sao",
      "Trạng thái",
      "Ngày tạo",
    ].join(",");

    const dataRows = rows.map((feedback) =>
      [
        escape(feedback.id),
        escape(feedback.user?.name ?? ""),
        escape(feedback.user?.username ?? ""),
        escape(feedback.content),
        escape(feedback.rating),
        escape(statusLabel[feedback.status] ?? feedback.status),
        escape(feedback.createdAt.toISOString().replace("T", " ").substring(0, 19)),
      ].join(",")
    );

    const csv = [header, ...dataRows].join("\n");
    const today = new Date().toISOString().substring(0, 10);
    const filename = `danh-gia-${normalizedTab}-${today}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Error exportCsv:", error);
    res.status(500).json({ code: 500, message: "Lỗi xuất báo cáo" });
  }
};
