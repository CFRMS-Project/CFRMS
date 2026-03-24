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
        ReviewMedia: { take: 2, orderBy: { id: "asc" } },
        Reply: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    })
  ]);

  const violationRate = totalCount ? (rejectedCount / totalCount) * 100 : 0;
  const paginationMeta = buildPaginationMeta(totalCount, page, limit);

  res.render("admin/pages/feedbacks/index", {
    pageTitle: "Danh sách phản hồi",
    stats: { pendingCount, approvedTodayCount, violationRate },
    tabCounts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount, all: allCount },
    filters: { q, tab: normalizedTab, page: paginationMeta.page, limit },
    pagination: paginationMeta,
    feedbacks: rows
  });
};
