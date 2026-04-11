import { defineConfig } from "cypress";
import { execSync } from "child_process";
import http from "http";

// URL của DB test
// Nếu chạy Cypress trong Docker, nó sẽ đọc biến CYPRESS_DB_URL (trỏ tới container db-test).
// Nếu chạy Cypress bằng npm (Local), nó sẽ dùng fallback localhost:5433
const TEST_DB_URL =
  process.env.CYPRESS_DB_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/cfrms_test";

const BASE_URL = "http://localhost:3001";

/**
 * Poll server cho đến khi nhận được HTTP response (bất kỳ status nào).
 * Dùng sau db:reset để đảm bảo nodemon đã khởi động lại xong trước khi test chạy.
 * Timeout mặc định: 15 giây, retry mỗi 500ms.
 */
function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume(); // Tiêu thụ response để tránh memory leak
          console.log(`[db:reset] Server sẵn sàng (status ${res.statusCode}) ✓`);
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start >= timeoutMs) {
            reject(new Error(`[db:reset] Server tại ${url} không phản hồi sau ${timeoutMs}ms`));
          } else {
            setTimeout(attempt, 500);
          }
        });
    };
    attempt();
  });
}

export default defineConfig({
  projectId: "pd5gos",
  e2e: {
    // Dùng 3001 để đảm bảo Cypress chạy trên Server Test (không đụng chạm Server 3000 thật)
    baseUrl: BASE_URL,

    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,

    // Tắt video để test chạy nhanh hơn
    video: false,

    // Vẫn chụp ảnh màn hình nếu có lỗi
    screenshotOnRunFailure: true,

    setupNodeEvents(on, _config) {
      on("task", {
        /**
         * Task: db:reset
         * Reset DB test về trạng thái sạch và seed lại dữ liệu trước mỗi lần test.
         * Sau khi seed xong, chờ server sẵn sàng (tránh ECONNREFUSED nếu nodemon restart).
         */
        "db:reset": async () => {
          const envWithDb = {
            ...process.env,
            DATABASE_URL: TEST_DB_URL,
          };

          const opts = {
            stdio: "inherit" as const,
            env: envWithDb,
          };

          console.log("[db:reset] Đang reset DB test...");
          console.log("[db:reset] DATABASE_URL =", TEST_DB_URL);

          try {
            // Bước 1: Reset schema (db push --force-reset xóa sạch DB và apply schema trực tiếp)
            execSync(
              "npx prisma db push --force-reset --accept-data-loss --schema=prisma/schema.prisma",
              opts
            );

            // Bước 2: Seed dữ liệu test
            execSync("npx tsx prisma/seed.test.ts", opts);

            console.log("[db:reset] Hoàn tất reset & seed. Đang chờ server...");

            // Bước 3: Chờ server sẵn sàng (phòng trường hợp nodemon restart)
            await waitForServer(BASE_URL);
          } catch (error) {
            console.error("[db:reset] Lỗi khi reset DB:", error);
            throw error;
          }

          return null;
        },

        /**
         * Hỗ trợ in log ra màn hình console terminal
         */
        log: (message: string) => {
          console.log("[Cypress]", message);
          return null;
        },
      });
    },
  },
});
