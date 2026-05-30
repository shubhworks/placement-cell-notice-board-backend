import { Router } from "express";
import { login, signup, saveExpoToken } from "../controllers/userControllers";
import { verifyToken } from "../middlewares/userAuthentication";

export const UserRouter = Router();

UserRouter.post("/signup", signup);
UserRouter.post("/login", login);
UserRouter.post("/save-token", verifyToken, saveExpoToken);