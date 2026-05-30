import { Response } from 'express';
import { Expo } from 'expo-server-sdk';
import { AuthRequest } from '../middlewares/userAuthentication';
import prisma from '../db/prisma';

const expo = new Expo();

export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, type, senderName, attachments } = req.body;
    const authorId = req.user?.id;

    if (!title || !content || !authorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Save to Database
    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        type,
        senderName,
        attachments: attachments || [],
        authorId
      }
    });

    res.status(201).json({ success: true, data: notice });

    // 2. Trigger Push Notifications Asynchronously (don't block the API response)
    sendExpoPushNotifications(title, content, type, notice.id);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create notice" });
  }
};

const sendExpoPushNotifications = async (title: string, content: string, type: string, noticeId: string) => {
  try {
    // Get all device tokens from DB
    const devices = await prisma.deviceToken.findMany();
    const pushTokens = devices.map((d: any) => d.token);

    if (pushTokens.length === 0) return;

    let emoji = "📢";
    if (type === "URGENT") emoji = "🚨";
    if (type === "PLACEMENT_DRIVE") emoji = "💼";

    const messages = [];
    for (let pushToken of pushTokens) {
      // Check if it's a valid Expo token
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default' as 'default',
        title: `${emoji} ${title}`,
        body: content.length > 80 ? content.substring(0, 80) + '...' : content,
        data: { noticeId }, // Data payload for the app to handle routing when tapped
      });
    }

    // Expo SDK handles batching to avoid hitting rate limits
    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error("Error sending chunk:", error);
      }
    }
  } catch (error) {
    console.error("Fatal error sending push notifications:", error);
  }
};

export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true } // Only send safe data
        }
      }
    });
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notices" });
  }
};