import { Router } from "express";
import { requireAdmin, verifyToken } from "../middlewares/userAuthentication";
import { createNotice, getNotices } from "../controllers/noticeControllers";

export const NoticeRouter = Router();

NoticeRouter.get("/", verifyToken, getNotices);
NoticeRouter.post("/create", verifyToken, requireAdmin, createNotice);