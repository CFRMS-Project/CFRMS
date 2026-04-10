import { Request, Response } from "express";
import prisma from "../../utils/db.js";
export const index = (req: Request, res: Response) => {
    res.render("customer/home", { currentUser: res.locals["currentUser"] || null });
};


export const home = async (req: Request, res: Response) => {
    try {
        const user = res.locals["currentUser"];
        const showAll = req.query.all === "1";
        const feedbacks = await prisma.feedback.findMany({
            where: showAll ? { isDeleted: false } : { userId: user.id, isDeleted: false },
            include: { reviewMedia: true },
            orderBy: { createdAt: "desc" },
        });

        const message = req.query.message as string | undefined;
        let toast = null;
        if (message === "success") {
            toast = { type: "success", text: "Gửi đánh giá thành công." };
        } else if (message === "update_success") {
            toast = { type: "success", text: "Cập nhật đánh giá thành công." };
        } else if (message === "hide_success") {
            toast = { type: "success", text: "Ẩn đánh giá thành công." };
        }

        res.render("customer/history", { feedbacks, toast, currentUser: user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi server");
    }
};