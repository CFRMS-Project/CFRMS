/**
 * =============================================================
 * Prisma Seed Script – Dành riêng cho môi trường TEST
 * =============================================================
 * Mục đích:
 *   - Xóa toàn bộ dữ liệu cũ trong DB test (theo thứ tự FK)
 *   - Tạo lại users, feedbacks, replies chuẩn cho E2E test
 *   - Ghi IDs vào cypress/fixtures/seed-data.json để test dùng
 *
 * Cách chạy:
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cfrms_test" \
 *   npx tsx prisma/seed.test.ts
 * =============================================================
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"],
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 [SEED] Bắt đầu seed DB test...");

  // ─── Bước 1: Xóa dữ liệu cũ (thứ tự FK: Reply → ReviewMedia → Feedback → User) ───
  await prisma.reply.deleteMany({});
  await prisma.reviewMedia.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✅ [SEED] Đã xóa toàn bộ dữ liệu cũ.");

  // ─── Bước 2: Tạo Users ───────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: "Admin CFRMS",
      username: "admin",
      password: "123",
      email: "admin@cfrms.test",
      role: "ADMIN",
    },
  });

  const customer01 = await prisma.user.create({
    data: {
      name: "Nguyễn Văn An",
      username: "customer01",
      password: "123",
      email: "customer01@cfrms.test",
      role: "CUSTOMER",
    },
  });

  const customer02 = await prisma.user.create({
    data: {
      name: "Trần Thị Bích",
      username: "customer02",
      password: "123",
      email: "customer02@cfrms.test",
      role: "CUSTOMER",
    },
  });

  console.log("✅ [SEED] Đã tạo 3 users (admin, customer01, customer02).");

  // ─── Bước 3: Tạo Feedbacks ──────────────────────────────────────────────────────
  // fb1: APPROVED – công khai, có trên product page
  const fb1 = await prisma.feedback.create({
    data: {
      rating: 5,
      content: "Sản phẩm rất tốt, chất lượng vượt mong đợi.",
      tags: "Giao nhanh, Đóng gói kỹ",
      isAnonymous: false,
      status: "APPROVED",
      userId: customer01.id,
    },
  });

  // fb2: PENDING – của customer01, dùng để test edit/hide
  const fb2 = await prisma.feedback.create({
    data: {
      rating: 4,
      content: "Đang chờ duyệt, sản phẩm ổn.",
      tags: "Đúng mô tả",
      isAnonymous: false,
      status: "PENDING",
      userId: customer01.id,
    },
  });

  // fb3: REJECTED – của customer01
  const fb3 = await prisma.feedback.create({
    data: {
      rating: 2,
      content: "Sản phẩm không như quảng cáo.",
      tags: "",
      isAnonymous: false,
      status: "REJECTED",
      userId: customer01.id,
    },
  });

  // fb4: APPROVED – ẩn danh, dùng để test mask name
  const fb4 = await prisma.feedback.create({
    data: {
      rating: 5,
      content: "Rất hài lòng! Đánh giá ẩn danh.",
      tags: "Chất lượng tốt",
      isAnonymous: true,
      status: "APPROVED",
      userId: customer02.id,
    },
  });

  // fb5: APPROVED – của customer02, dùng để test quyền edit (user khác không sửa được)
  const fb5 = await prisma.feedback.create({
    data: {
      rating: 3,
      content: "Sản phẩm của customer02, chất lượng trung bình.",
      tags: "",
      isAnonymous: false,
      status: "APPROVED",
      userId: customer02.id,
    },
  });

  console.log("✅ [SEED] Đã tạo 5 feedbacks.");

  // ─── Bước 4: Tạo Reply cho fb3 (REJECTED) ────────────────────────────────────────
  const reply1 = await prisma.reply.create({
    data: {
      content: "Xin lỗi vì trải nghiệm không tốt, chúng tôi sẽ cải thiện.",
      feedbackId: fb3.id,
      adminId: admin.id,
    },
  });

  console.log("✅ [SEED] Đã tạo 1 reply.");

  // ─── Bước 5: Ghi seed-data.json cho Cypress đọc ──────────────────────────────────
  const seedData = {
    users: {
      adminId: admin.id,
      customer01Id: customer01.id,
      customer02Id: customer02.id,
    },
    feedbacks: {
      approvedId: fb1.id,           // customer01 – APPROVED
      pendingId: fb2.id,            // customer01 – PENDING (dùng edit/hide)
      rejectedId: fb3.id,           // customer01 – REJECTED (có reply)
      anonymousApprovedId: fb4.id,  // customer02 – APPROVED + ẩn danh
      customer02ApprovedId: fb5.id, // customer02 – APPROVED (test quyền)
    },
    replies: {
      reply1Id: reply1.id,
    },
  };

  const fixturePath = path.resolve("cypress/fixtures/seed-data.json");
  fs.writeFileSync(fixturePath, JSON.stringify(seedData, null, 2));
  console.log(`✅ [SEED] Đã ghi seed-data.json → ${fixturePath}`);
  console.log("🎉 [SEED] Hoàn tất!");
}

main()
  .catch((e) => {
    console.error("❌ [SEED] Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
