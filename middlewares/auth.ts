/**
 * =============================================================
 * Auth Middleware: Bảo vệ Route theo Session & Role
 * =============================================================
 * - requireLogin: Kiểm tra đã đăng nhập chưa
 * - requireRole: Kiểm tra quyền truy cập theo Role
 * =============================================================
 */

import type { Request, Response, NextFunction } from "express";

// --- Yêu cầu đăng nhập ---
export const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req.session as any)["user"];
  if (!user) {
    res.redirect("/login");
    return;
  }
  // Gắn user vào res.locals để dùng trong view
  res.locals["currentUser"] = user;
  next();
};

// --- Yêu cầu đúng Role ---
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)["user"];
    if (!user) {
      res.redirect("/login");
      return;
    }
    if (user.role !== role) {
      res.status(403).send("Bạn không có quyền truy cập trang này.");
      return;
    }
    res.locals["currentUser"] = user;
    next();
  };
};
