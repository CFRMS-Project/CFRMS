import { defineConfig } from "cypress";
import http from "http";

// URL của DB test
// Nếu chạy Cypress trong Docker, nó sẽ đọc biến CYPRESS_DB_URL (trỏ tới container db-test).
// Nếu chạy Cypress bằng npm (Local), nó sẽ dùng fallback localhost:5433
const TEST_DB_URL =
  process.env.CYPRESS_DB_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/cfrms_test";

// Nếu chạy trong Docker, CYPRESS_baseUrl được set bởi docker-compose (http://web-test:3000)
// Nếu chạy local, fallback về localhost:3001
const BASE_URL = process.env.CYPRESS_baseUrl ?? "http://localhost:3001";

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

    // Cho db:reset task (prisma push + seed) đủ thời gian hoàn tất
    taskTimeout: 90000,

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
          console.log(`[db:reset] Đang gửi yêu cầu reset DB tới ${BASE_URL}/api/test/reset...`);

          // Đọc token từ env
          const resetToken =
            process.env.CYPRESS_TEST_RESET_TOKEN ||
            process.env.TEST_RESET_TOKEN ||
            "";

          try {
            await new Promise((resolve, reject) => {
              const req = http.request(
                `${BASE_URL}/api/test/reset`,
                {
                  method: "POST",
                  headers: {
                    // Gửi kèm secret token để server xác thực trước khi reset DB
                    "x-test-reset-token": resetToken,
                  },
                },
                (res) => {
                  let data = "";
                  res.on("data", (chunk) => { data += chunk; });
                  res.on("end", () => {
                    if (res.statusCode === 200) {
                      console.log("[db:reset] Server đã reset và seed xong DB ✓");
                      resolve(null);
                    } else {
                      reject(new Error(`[db:reset] Lỗi từ Server (status ${res.statusCode}): ${data}`));
                    }
                  });
                }
              );
              // Timeout 60s để Prisma db push + seed có đủ thời gian chạy
              req.setTimeout(60000, () => {
                req.destroy();
                reject(new Error("[db:reset] HTTP request tới /api/test/reset bị timeout sau 60s"));
              });
              req.on("error", (err) => {
                reject(new Error(`[db:reset] Không thể kết nối tới server tại ${BASE_URL}: ${err.message}`));
              });
              req.end();
            });

            // Bước 3: Đợi một chút cho chắc chắn server đã sẵn sàng hoàn toàn
            await waitForServer(BASE_URL);
          } catch (error) {
            console.error("[db:reset] Lỗi khi reset DB qua API:", error);
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
