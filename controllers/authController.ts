/**
 * =============================================================
 * Auth Controller: Xử lý Đăng nhập / Đăng xuất
 * =============================================================
 * - showLogin: Hiển thị trang đăng nhập
 * - handleLogin: Xác thực username + password, lưu session, redirect theo role
 * - handleLogout: Xóa session và redirect về trang login
 * =============================================================
 */

import type { Request, Response } from "express";
import prisma from "../utils/db.js";

// --- Hiển thị form đăng nhập ---
export const showLogin = (req: Request, res: Response) => {
  res.render("partials/login", { errorMessage: null });
};

// --- Xử lý đăng nhập ---
export const handleLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username: string; password: string };

    // 1. Tìm user theo username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // 2. Kiểm tra user tồn tại
    if (!user) {
      res.render("partials/login", {
        errorMessage: "Tên đăng nhập không tồn tại!",
      });
      return;
    }

    // 3. So sánh mật khẩu (plain-text theo yêu cầu không sửa DB)
    if (user.password !== password) {
      res.render("partials/login", {
        errorMessage: "Mật khẩu không chính xác!",
      });
      return;
    }

    // 4. Lưu thông tin user vào session
    (req.session as any)["user"] = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
    };

    // 5. Redirect theo role
    if (user.role === "ADMIN") {
      res.redirect("/admin/dashboard");
    } else {
      res.redirect("/customer/home");
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.render("partials/login", {
      errorMessage: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại!",
    });
  }
};

// --- Xử lý đăng xuất ---
export const handleLogout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Lỗi đăng xuất:", err);
    }
    res.redirect("/login");
  });
};
