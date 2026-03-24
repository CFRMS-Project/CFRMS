import { Router, Express } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/db";
const router: Router = Router();
import * as controller from "../../controllers/customer/home.controller"
router.get("/home", controller.index);

router.get("/history", controller.home)
export const homeRoutes: Router = router;