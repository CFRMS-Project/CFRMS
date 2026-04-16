/**
 * =============================================================
 * Auth Controller: Xử lý Đăng nhập / Đăng xuất
 * =============================================================
 * - showLogin:       Hiển thị trang đăng nhập chung (customer)
 * - handleLogin:     Xác thực customer, lưu session, redirect
 * - showAdminLogin:  Hiển thị trang đăng nhập dành riêng cho admin
 * - handleAdminLogin:Xác thực admin, chỉ chấp nhận role ADMIN
 * - handleLogout:    Xóa session và redirect về trang login
 * =============================================================
 */

import type { Request, Response } from "express";
import prisma from "../utils/db.js";
import { validateLoginPayload } from "../utils/validation.js";

// --- Hiển thị form đăng nhập chung (customer) ---
export const showLogin = (req: Request, res: Response) => {
  res.render("partials/login", { errorMessage: null });
};

export const showAdminLogin = (req: Request, res: Response) => {
  res.render("admin/pages/auth/login", { errorMessage: null });
};

// --- Xử lý đăng nhập chung ---
export const handleLogin = async (req: Request, res: Response) => {
  try {
    const validation = validateLoginPayload(req.body as {
      username?: unknown;
      password?: unknown;
    });
    if (!validation.ok) {
      res.render("partials/login", {
        errorMessage: validation.message,
      });
      return;
    }

    const { username, password } = validation.value;

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

// --- Xử lý đăng nhập Admin (chỉ cho phép role ADMIN) ---
export const handleAdminLogin = async (req: Request, res: Response) => {
  try {
    const validation = validateLoginPayload(req.body as {
      username?: unknown;
      password?: unknown;
    });
    if (!validation.ok) {
      res.render("admin/pages/auth/login", {
        errorMessage: validation.message,
      });
      return;
    }

    const { username, password } = validation.value;

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      res.render("admin/pages/auth/login", {
        errorMessage: "Tên đăng nhập không tồn tại!",
      });
      return;
    }

    if (user.password !== password) {
      res.render("admin/pages/auth/login", {
        errorMessage: "Mật khẩu không chính xác!",
      });
      return;
    }

    if (user.role !== "ADMIN") {
      res.render("admin/pages/auth/login", {
        errorMessage: "Bạn không có quyền truy cập trang quản trị!",
      });
      return;
    }

    (req.session as any)["user"] = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      avatar: user.avatar,
    };

    res.redirect("/admin/dashboard");
  } catch (error) {
    console.error("Lỗi đăng nhập admin:", error);
    res.render("admin/pages/auth/login", {
      errorMessage: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại!",
    });
  }
};

// --- Xử lý đăng xuất ---
export const handleLogout = (req: Request, res: Response) => {
  const role = (req.session as any)?.user?.role;

  req.session.destroy((err) => {
    if (err) {
      console.error("Lỗi đăng xuất:", err);
    }

    // Điều hướng dựa trên role trước khi đăng xuất
    if (role === "ADMIN") {
      res.redirect("/admin/login");
    } else {
      res.redirect("/login");
    }
  });
};
