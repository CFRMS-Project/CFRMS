import { Express } from "express";
import { feedbackRoutes } from "./feedback.route";
import { dashboardRoutes } from "./dashboard.route";
import { authRoutes } from "./auth.route";
import { prefixAdmin } from "../../config/systemConfig";
const adminRoutes = (app:Express)=>{
  app.use(prefixAdmin +"/feedbacks",feedbackRoutes)
  app.use(prefixAdmin + "/dashboard", dashboardRoutes)
  app.use(prefixAdmin + "/", authRoutes)
}

export default adminRoutes;