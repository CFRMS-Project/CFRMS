/**
 * =============================================================
 * Auth Middleware: Bảo vệ Route theo Session & Role
 * =============================================================
 * - requireLogin:  Yêu cầu đăng nhập, redirect /login nếu chưa
 * - optionalAuth:  Gắn currentUser nếu có session, không chặn
 * - requireRole:   Kiểm tra quyền truy cập theo Role
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
  res.locals["currentUser"] = user;
  next();
};

// --- Gắn user nếu có session (không chặn, dùng cho trang public) ---
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = (req.session as any)["user"];
  if (user) {
    res.locals["currentUser"] = user;
  }
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
