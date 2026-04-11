import { Express } from "express";
import { feedbackRoutes } from "./feedback.route";
import { dashboardRoutes } from "./dashboard.route";
import { authRoutes } from "./auth.route";
import { prefixAdmin } from "../../config/systemConfig";
import { requireRole } from "../../middlewares/auth";
const adminRoutes = (app:Express)=>{
  app.use(prefixAdmin +"/feedbacks", requireRole("ADMIN"), feedbackRoutes)
  app.use(prefixAdmin + "/dashboard", requireRole("ADMIN"), dashboardRoutes)
  app.use(prefixAdmin + "/", authRoutes)
}

export default adminRoutes;