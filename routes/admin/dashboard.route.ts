import express, { Router } from "express";
import * as controller from "../../controllers/admin/dashboard.controller"
const router: Router = Router()
router.get("/", controller.index)
router.get("/export-csv", controller.exportCsv)

export const dashboardRoutes: Router = router