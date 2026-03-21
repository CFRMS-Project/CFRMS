import { Express } from "express";
import { feedbackRoutes } from "./feedback.route";
import { dashboardRoutes } from "./dashboard.route";
import { prefixAdmin } from "../../config/systemConfig";
const adminRoutes = (app:Express)=>{
  app.use(prefixAdmin +"/feedbacks",feedbackRoutes)
  app.use(prefixAdmin + "/dashboard", dashboardRoutes)
}

export default adminRoutes;