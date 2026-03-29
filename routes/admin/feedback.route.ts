import express, { Router } from "express";
const router: Router = Router()
import * as controller from "../../controllers/admin/feedback.controller"
router.get("/", controller.index)

router.get("/detail/:id", controller.detail)

router.patch("/change-status/:status/:id", controller.changeStatus)
router.patch("/change-multi", controller.changeMulti)

export const feedbackRoutes: Router = router