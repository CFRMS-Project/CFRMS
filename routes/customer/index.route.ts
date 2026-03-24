import { Router, Express } from "express";
import { feedbackRoutes } from "./feedback.routes";
import { requireLogin } from "../../middlewares/auth";
import { homeRoutes } from "./home.routes";

export const router = Router();

const clientRoutes = (app: Express) => {
    app.use("/customer", requireLogin, homeRoutes);
    app.use("/feedback", requireLogin, feedbackRoutes);
}
export default clientRoutes;
