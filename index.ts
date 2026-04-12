import dotenv from "dotenv"
dotenv.config()
import express, { Express, Request, Response } from "express"
import session from "express-session";
import path from "node:path";
import authRoutes from "./routes/authRoutes";
import clientRoutes from "./routes/customer/index.route";
import adminRoutes from "./routes/admin/index.route"
import { fileURLToPath } from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app: Express = express()
const PORT = process.env["PORT"] || 3000;

app.set("view engine", "pug")

app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// --- Cấu hình Body Parser ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Cấu hình Session ---
app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "shopvn-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true khi dùng HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 giờ
    },
  })
);

// --- Routes Công khai (không cần đăng nhập) ---
app.use("/", authRoutes);

// Root → redirect /customer/home
app.get("/", (_req, res) => {
  res.redirect("/customer/home");
});

// --- API Hỗ trợ Test (Chỉ bật khi NODE_ENV=test VÀ ENABLE_TEST_RESET_API=true) ---
// Phải đặt cả 2 biến môi trường này một cách chủ động để tránh vô tình bật trong staging/production.
const enableTestResetApi =
  process.env.NODE_ENV === "test" &&
  process.env.ENABLE_TEST_RESET_API === "true";

if (enableTestResetApi) {
  console.log("[Test API] API /api/test/reset đã được bật (NODE_ENV=test, ENABLE_TEST_RESET_API=true).");

  app.post("/api/test/reset", (req, res) => {
    // Đọc token từ env - không dùng hardcode để tránh bị AI/Scanner cảnh báo
    const token = process.env.TEST_RESET_TOKEN;
    if (!token || req.get("x-test-reset-token") !== token) {
      return res.sendStatus(403);
    }

    import("child_process")
      .then(({ execSync }) => {
        try {
          execSync("npx prisma db push --force-reset --accept-data-loss --schema=prisma/schema.prisma", { stdio: "inherit" });
          execSync("npx tsx prisma/seed.test.ts", { stdio: "inherit" });
          res.status(200).send("OK");
        } catch {
          // Không leak chi tiết lỗi nội bộ ra client
          res.status(500).send("Reset failed. Check server logs.");
        }
      })
      .catch(() => res.status(500).send("Internal error."));
  });
}


// --- Routes Customer ---
clientRoutes(app);
adminRoutes(app)
app.use((req: Request, res: Response) => {
  res.status(404).render("customer/pages/errors/404")
})

// --- Khởi động Server ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`Trang đăng nhập: http://localhost:${PORT}/login`);
});


