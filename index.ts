import dotenv from "dotenv"
dotenv.config()
import express, { Express, Request, Response } from "express"
import session from "express-session";

import authRoutes from "./routes/authRoutes";
import clientRoutes from "./routes/customer/index.route";
import adminRoutes from "./routes/admin/index.route"
import { requireLogin } from "./middlewares/auth";
import prisma from "./utils/db";

const app: Express = express()
const PORT = process.env["PORT"] || 3000;

app.set("view engine", "pug")
app.set("views", `${__dirname}/views`);

app.use(express.static(`${__dirname}/public`));

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

// Root → redirect /login
app.get("/", (_req, res) => {
  res.redirect("/login");
});

// --- Routes Customer ---
clientRoutes(app);
adminRoutes(app)


// --- Khởi động Server ---
app.listen(PORT, () => {
  console.log(`Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`Trang đăng nhập: http://localhost:${PORT}/login`);
});

=
