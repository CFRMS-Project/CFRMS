// utils/db.ts
import "dotenv/config"; // Nạp biến môi trường ngay tại đây
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Dòng debug này rất quan trọng để kiểm tra
console.log("🔍 Kiểm tra DATABASE_URL:", process.env.DATABASE_URL ? "Đã tìm thấy" : "Chưa có (Undefined)");

// Tạo connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tạo adapter từ pool
const adapter = new PrismaPg(pool);

// Khởi tạo PrismaClient với adapter
const prisma = new PrismaClient({ adapter });

export default prisma;