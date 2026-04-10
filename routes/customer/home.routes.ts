import { Router } from "express";
import { requireLogin } from "../../middlewares/auth";
import * as controller from "../../controllers/customer/home.controller"

const router: Router = Router();

// Public: không cần đăng nhập
router.get("/home", controller.index);

// Protected: cần đăng nhập
router.get("/history", requireLogin, controller.home);

export const homeRoutes: Router = router;