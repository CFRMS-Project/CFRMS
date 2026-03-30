import "dotenv/config";
import { Request, Response } from "express"
import { PrismaClient, StatusEnum } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.utils";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
export const index = async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  const tab = String(req.query.tab || "pending");
  const sort = String(req.query.sort || "desc");
  const { page, limit, skip } = parsePagination({
    pageQuery: req.query.page,
    defaultLimit: 10,
  });

  const statusMap: Record<string, StatusEnum | undefined> = {
    pending: StatusEnum.PENDING,
    approved: StatusEnum.APPROVED,
    rejected: StatusEnum.REJECTED,
    all: undefined
  };

  const normalizedTab = Object.prototype.hasOwnProperty.call(statusMap, tab)
    ? tab
    : "pending";
  const selectedStatus = statusMap[normalizedTab];

  const whereBase: any = {
    isDeleted: false,
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(q
      ? {
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { tags: { contains: q, mode: "insensitive" } },
          { user: { is: { name: { contains: q, mode: "insensitive" } } } },
          { user: { is: { username: { contains: q, mode: "insensitive" } } } }
        ]
      }
      : {})
  };

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
    rows
  ] = await Promise.all([
    prisma.feedback.count({ where: { isDeleted: false, status: StatusEnum.PENDING } }),
    prisma.feedback.count({ where: { isDeleted: false, status: StatusEnum.APPROVED } }),
    prisma.feedback.count({ where: { isDeleted: false, status: StatusEnum.REJECTED } }),
    prisma.feedback.count({ where: { isDeleted: false } }),
    prisma.feedback.count({
      where: {
        isDeleted: false,
        status: StatusEnum.APPROVED,
        updatedAt: { gte: startToday, lte: endToday }
      }
    }),
    prisma.feedback.count({ where: whereBase }),
    prisma.feedback.findMany({
      where: whereBase,
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
        reviewMedia: { take: 5, orderBy: { id: "asc" } },
        reply: true
      },
      orderBy: { createdAt: orderByDirection },
      skip,
      take: limit
    })
  ]);

  const violationRate = allCount ? (rejectedCount / allCount) * 100 : 0;
  const paginationMeta = buildPaginationMeta(totalCount, page, limit);

  res.render("admin/pages/feedbacks/index", {
    pageTitle: "Danh sách phản hồi",
    stats: { pendingCount, approvedTodayCount, violationRate },
    tabCounts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount, all: allCount },
    filters: { q, tab: normalizedTab, sort, page: paginationMeta.page, limit },
    pagination: paginationMeta,
    feedbacks: rows
  });
};

export const detail = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: "ID đánh giá không hợp lệ" });
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id: id },
      include: {
        user: { select: { id: true, name: true, avatar: true, username: true } },
        reviewMedia: true,
        reply: true
      }
    });

    if (!feedback) {
      return res.status(404).json({ code: 404, message: "Không tìm thấy đánh giá" });
    }

    // Enhance payload with fake price and product as requested
    const responseData = {
      ...feedback,
      product: {
        name: "Nhẫn Kim Cương Luxury Elite",
        fakePrice: "250.000.000đ"
      }
    };

    res.json({ code: 200, data: responseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const changeStatus = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const statusStr = String(req.params.status).toUpperCase();
    const reply = req.body.reply || "";

    if (isNaN(id) || !["APPROVED", "REJECTED"].includes(statusStr)) {
      return res.status(400).json({ code: 400, message: "Dữ liệu không hợp lệ" });
    }

    const updateData: any = { status: statusStr as StatusEnum };

    // Update feedback status
    const feedback = await prisma.feedback.update({
      where: { id },
      data: updateData
    });

    // If there is a reply, upsert the reply record
    if (reply && reply.trim() !== "") {
      const existingReply = await prisma.reply.findFirst({
        where: { feedbackId: id }
      });
      if (existingReply) {
        await prisma.reply.update({
          where: { id: existingReply.id },
          data: { content: reply }
        });
      } else {
        await prisma.reply.create({
          data: {
            content: reply,
            feedbackId: id,
            adminId: res.locals.user?.id || 1 // default fallback
          }
        });
      }
    }

    res.json({ code: 200, message: "Cập nhật trạng thái thành công" });
  } catch (error) {
    console.error("Error changeStatus:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

export const changeMulti = async (req: Request, res: Response) => {
  try {
    const { action, ids } = req.body;
    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ code: 400, message: "Dữ liệu không hợp lệ" });
    }

    const numIds = ids.map((id: any) => parseInt(id)).filter(id => !isNaN(id));

    if (action === "approve") {
      await prisma.feedback.updateMany({
        where: { id: { in: numIds } },
        data: { status: StatusEnum.APPROVED }
      });
    } else if (action === "delete") {
      await prisma.feedback.updateMany({
        where: { id: { in: numIds } },
        data: { isDeleted: true }
      });
    } else {
      return res.status(400).json({ code: 400, message: "Hành động không được hỗ trợ" });
    }

    res.json({ code: 200, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Error changeMulti:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

/**
 * [XÓA ĐÁNH GIÁ VI PHẠM]
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: "ID không hợp lệ" });
    }

    await prisma.feedback.update({
      where: { id },
      data: { isDeleted: true }
    });

    res.json({ code: 200, message: "Xóa thành công!" });
  } catch (error) {
    console.error("Error deleteItem:", error);
    res.status(500).json({ code: 500, message: "Lỗi máy chủ" });
  }
};

/**
 * [XUẤT BÁO CÁO CSV]
 * Xuất toàn bộ feedback theo filter (tab, q, sort) dạng file CSV
 */
export const exportCsv = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const tab = String(req.query.tab || "all");
    const sort = String(req.query.sort || "desc");

    const statusMap: Record<string, StatusEnum | undefined> = {
      pending: StatusEnum.PENDING,
      approved: StatusEnum.APPROVED,
      rejected: StatusEnum.REJECTED,
      all: undefined
    };

    const normalizedTab = Object.prototype.hasOwnProperty.call(statusMap, tab) ? tab : "all";
    const selectedStatus = statusMap[normalizedTab];

    const whereBase: any = {
      isDeleted: false,
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(q
        ? {
          OR: [
            { content: { contains: q, mode: "insensitive" } },
            { tags: { contains: q, mode: "insensitive" } },
            { user: { is: { name: { contains: q, mode: "insensitive" } } } },
            { user: { is: { username: { contains: q, mode: "insensitive" } } } }
          ]
        }
        : {})
    };

    const orderByDirection = sort === "asc" ? "asc" : "desc";

    const rows = await prisma.feedback.findMany({
      where: whereBase,
      include: {
        user: { select: { name: true, username: true } }
      },
      orderBy: { createdAt: orderByDirection }
    });

    // Build CSV
    const escape = (val: any): string => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const statusLabel: Record<string, string> = {
      PENDING: "Chờ duyệt",
      APPROVED: "Đã duyệt",
      REJECTED: "Bị từ chối"
    };

    const header = ["ID", "Khách hàng", "Username", "Nội dung", "Số sao", "Trạng thái", "Ngày tạo"].join(",");
    const dataRows = rows.map(fb => [
      escape(fb.id),
      escape(fb.user?.name ?? ""),
      escape(fb.user?.username ?? ""),
      escape(fb.content),
      escape(fb.rating),
      escape(statusLabel[fb.status] ?? fb.status),
      escape(fb.createdAt.toISOString().replace("T", " ").substring(0, 19))
    ].join(","));

    const csv = [header, ...dataRows].join("\n");

    const today = new Date().toISOString().substring(0, 10);
    const filename = `danh-gia-${normalizedTab}-${today}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // BOM để Excel mở đúng tiếng Việt
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Error exportCsv:", error);
    res.status(500).json({ code: 500, message: "Lỗi xuất báo cáo" });
  }
};