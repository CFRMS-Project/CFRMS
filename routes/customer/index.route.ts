import { Router, Express } from "express";
import { feedbackRoutes } from "./feedback.routes";
import { requireLogin, optionalAuth } from "../../middlewares/auth";
import { homeRoutes } from "./home.routes";

export const router = Router();

const clientRoutes = (app: Express) => {
    // Trang home: public, nhưng vẫn gắn user nếu đã login
    app.use("/customer", optionalAuth, homeRoutes);
    // Trang tính năng feedback: để optionalAuth bọc ngoài, sẽ có route công khai & bắt buộc login bên trong
    app.use("/feedback", optionalAuth, feedbackRoutes);
}
export default clientRoutes;
