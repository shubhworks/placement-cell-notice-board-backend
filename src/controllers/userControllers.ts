import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/userAuthentication';
import prisma from '../db/prisma';
import { signinValidationSchema, signupValidationSchema } from '../lib/zodSchema';
import { JWT_SECRET } from '../config';


export const signup = async (req: Request, res: Response) => {
    try {

        const result = signupValidationSchema.safeParse(req.body);

        // If validation fails, return an error
        if (!result.success) {
            res.status(400).json({
                message: 'Validation error',
                errors: result.error.flatten().fieldErrors,
            });
            return;
        }

        const { username, email, password } = result.data;

        // Check if user already exists, By email!
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({
                message: "User already exists with this Email!!"
            });
            return;
        }

        // HASHING THE PASSWORD:

        const hashedPassword = await bcrypt.hash(password, 10);

        // STORING the user to Database!
        const USER = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        });

        res.status(201).json({
            message: `User created successfully!`,
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Something Went Wrong, Please Try Again Later"
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const result = signinValidationSchema.safeParse(req.body);

        // If validation fails, return an error
        if (!result.success) {
            res.status(400).json({
                message: "Validation error",
                errors: result.error.flatten().fieldErrors,
            });
            return;
        }

        const { email, password } = result.data;

        // Find the user in the database
        const user = await prisma.user.findUnique({
            where: {
                email: email,
            },
        });

        if (!user) {
            res.status(400).json({
                message: "User Not Found by this email"
            });
            return;
        }

        const checkForPassword = await bcrypt.compare(password, user.password);
        if (!checkForPassword) {
            res.status(401).json({
                message: "Incorrect Password, Please try again!"
            });
            return;
        }

        // Compare password with hashed password in DB
        const matchPassword = await bcrypt.compare(password, user.password);
        if (!matchPassword) {
            res.status(401).json({
                message: "Incorrect Password!"
            });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "30d" // Token expires in 30 days
            }
        );

        res.status(200).json({ user: { id: user.id, username: user.username, role: user.role }, token });

    } catch (error) {
        console.error("Signin Error:", error);
        res.status(500).json({
            message: "Something Went Wrong, Please Try Again Later"
        });
    }
};

// React Native app will call this every time the app opens
export const saveExpoToken = async (req: AuthRequest, res: Response) => {
    try {
        const { pushToken } = req.body;
        const userId = req.user?.id;

        if (!pushToken || !userId) return res.status(400).json({ error: "Missing required fields" });

        // Upsert ensures we don't save duplicate tokens
        await prisma.deviceToken.upsert({
            where: { token: pushToken },
            update: { userId }, // Update ownership if somehow changed
            create: { token: pushToken, userId }
        });

        res.status(200).json({ success: true, message: "Push token saved" });
    } catch (error) {
        res.status(500).json({ error: "Failed to save push token" });
    }
};