import type { NextFunction, Request, Response } from "express";

const getLoginRedirectPath = (req: Request): string => {
  return req.originalUrl.startsWith("/admin") ? "/admin/login" : "/login";
};

export const requireLogin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req.session as any)["user"];
  if (!user) {
    res.redirect(getLoginRedirectPath(req));
    return;
  }

  res.locals["currentUser"] = user;
  next();
};

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req.session as any)["user"];
  if (user) {
    res.locals["currentUser"] = user;
  }

  next();
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)["user"];
    if (!user) {
      res.redirect(getLoginRedirectPath(req));
      return;
    }

    if (user.role !== role) {
      res.status(404).render("customer/pages/errors/404");
      return;
    }

    res.locals["currentUser"] = user;
    next();
  };
};
