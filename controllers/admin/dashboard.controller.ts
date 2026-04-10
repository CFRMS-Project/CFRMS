import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// ── Helpers ──────────────────────────────────────────────────────────────────
const getDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function buildTimeSeries(raw: { createdAt: Date }[], days: number): { labels: string[]; values: number[]; total: number } {
  const now = new Date();
  const counts: Record<string, number> = {};
  const labels: string[] = [];
  const keys: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = getDateKey(d);
    counts[key] = 0;
    keys.push(key);
    labels.push(days <= 7 ? (DAY_LABELS[d.getDay()] ?? "") : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  for (const fb of raw) {
    const key = getDateKey(fb.createdAt);
    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  const values = keys.map(k => counts[k] ?? 0);
  return { labels, values, total: values.reduce((a, b) => a + b, 0) };
}

// ── Controller ───────────────────────────────────────────────────────────────
export const index = async (_req: Request, res: Response) => {
  const now = new Date();
  const sevenDaysAgo  = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6);   sevenDaysAgo.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29); thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Chạy tất cả query song song
  const [
    totalFeedbacks,
    ratingGroups,
    withMediaCount,
    weeklyRaw,
    monthlyRaw,
    recentFeedbacks,
  ] = await Promise.all([
    prisma.feedback.count({ where: { isDeleted: false } }),
    prisma.feedback.groupBy({
      by: ["rating"],
      where: { isDeleted: false },
      _count: { rating: true },
      _sum:   { rating: true },
    }),
    prisma.feedback.count({ where: { isDeleted: false, reviewMedia: { some: {} } } }),
    prisma.feedback.findMany({ where: { isDeleted: false, createdAt: { gte: sevenDaysAgo } },  select: { createdAt: true } }),
    prisma.feedback.findMany({ where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.feedback.findMany({
      where: { isDeleted: false },
      include: {
        user:        { select: { id: true, name: true, avatar: true, username: true } },
        reviewMedia: { take: 1, orderBy: { id: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  // Phân bố sao
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalStars = 0;
  for (const g of ratingGroups) {
    const r = Number(g.rating);
    if (r >= 1 && r <= 5) {
      ratingDistribution[r] = g._count.rating;
      totalStars += g._sum.rating ?? 0;
    }
  }

  const avgRating = totalFeedbacks > 0 ? Math.round((totalStars / totalFeedbacks) * 10) / 10 : 0;

  const ratingPercent: Record<number, number> = {};
  for (let r = 1; r <= 5; r++) {
    ratingPercent[r] = totalFeedbacks > 0 ? Math.round(((ratingDistribution[r] ?? 0) / totalFeedbacks) * 100) : 0;
  }

  // Tỉ lệ ảnh
  const withMediaPercent = totalFeedbacks > 0 ? Math.round((withMediaCount / totalFeedbacks) * 100) : 0;
  const textOnlyPercent  = 100 - withMediaPercent;

  // Time series
  const weekly  = buildTimeSeries(weeklyRaw,  7);
  const monthly = buildTimeSeries(monthlyRaw, 30);

  // Nhãn ngày hiện tại (ví dụ: Thứ 4, 25/03/2026)
  const thuMap = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const currentDateLabel = `${thuMap[now.getDay()] ?? ""}, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  res.render("admin/pages/dashboard/index", {
    pageTitle: "Trang tổng quan",
    currentDateLabel,
    totalFeedbacks,
    avgRating,
    ratingPercent,
    ratingDistribution,
    withMediaPercent,
    textOnlyPercent,
    weeklyLabels:  JSON.stringify(weekly.labels),
    weeklyValues:  JSON.stringify(weekly.values),
    weeklyTotal:   weekly.total,
    monthlyLabels: JSON.stringify(monthly.labels),
    monthlyValues: JSON.stringify(monthly.values),
    monthlyTotal:  monthly.total,
    recentFeedbacks,
  });
};

// ── Export CSV ────────────────────────────────────────────────────────────────
export const exportCsv = async (_req: Request, res: Response) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Lấy toàn bộ feedback trong 30 ngày kèm media
  const feedbacks = await prisma.feedback.findMany({
    where: { isDeleted: false, createdAt: { gte: thirtyDaysAgo } },
    select: {
      createdAt:   true,
      rating:      true,
      status:      true,
      isAnonymous: true,
      reviewMedia: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Nhóm theo ngày
  const dayStats: Record<string, { total: number; sumRating: number; withMedia: number }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dayStats[getDateKey(d)] = { total: 0, sumRating: 0, withMedia: 0 };
  }

  for (const fb of feedbacks) {
    const key = getDateKey(fb.createdAt);
    if (!Object.prototype.hasOwnProperty.call(dayStats, key)) continue;
    const s = dayStats[key]!;
    s.total++;
    s.sumRating += fb.rating;
    if (fb.reviewMedia.length > 0) s.withMedia++;
  }

  // Xây dựng CSV
  const BOM = "\uFEFF"; // UTF-8 BOM cho Excel
  const headers = ["Ngày", "Tổng phản hồi", "Điểm TB", "Có ảnh/video", "Chỉ văn bản"];
  const rows = Object.entries(dayStats).map(([date, s]) => {
    const avg = s.total > 0 ? (s.sumRating / s.total).toFixed(1) : "0.0";
    const textOnly = s.total - s.withMedia;
    return [date, s.total, avg, s.withMedia, textOnly].join(",");
  });

  const csv = BOM + [headers.join(","), ...rows].join("\r\n");

  const filename = `dashboard_${getDateKey(now)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
};