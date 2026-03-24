import express, { Router } from "express";
const router: Router = Router()
import * as controller from "../../controllers/admin/feedback.controller"
router.get("/",controller.index)
export const feedbackRoutes: Router = router