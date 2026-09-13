import { Request, Response } from "express";
import { z } from "zod";
import { NotificationService } from "../services/notification.service";

const uuidSchema = z.string().uuid();

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getUserNotifications = async (req: Request, res: Response) => {
    try {
      console.log("req.query =", req.query);
      console.log("req.query.userId =", req.query.userId);
      console.log("typeof userId =", typeof req.query.userId);

      const rawUserId = req.query.userId;

      if (typeof rawUserId !== "string") {
        return res.status(400).json({
          error: "userId query parameter is required",
          received: rawUserId,
        });
      }

      const userId = rawUserId.trim();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(userId)) {
        return res.status(400).json({
          error: "Invalid userId format",
          received: userId,
        });
      }

      const notifications =
        await this.notificationService.getUserNotifications(userId);

      return res.status(200).json({
        notifications,
      });
    } catch (error) {
      console.error("Error getting notifications:", error);

      return res.status(500).json({
        error: "Could not get notifications",
      });
    }
  };

  getUnreadNotifications = async (req: Request, res: Response) => {
    try {
      const userId = uuidSchema.parse(req.query.userId);

      const notifications =
        await this.notificationService.getUnreadNotifications(userId);

      return res.status(200).json({
        count: notifications.length,
        notifications,
      });
    } catch (error) {
      console.error("Error getting unread notifications:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "A valid userId is required",
        });
      }

      return res.status(500).json({
        error: "Could not get unread notifications",
      });
    }
  };

  markAsRead = async (req: Request, res: Response) => {
    try {
      const notificationId = uuidSchema.parse(req.params.id);

      const notification =
        await this.notificationService.markAsRead(notificationId);

      return res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "A valid notification id is required",
        });
      }

      if (
        error instanceof Error &&
        error.message === "Notification not found"
      ) {
        return res.status(404).json({
          error: "Notification not found",
        });
      }

      return res.status(500).json({
        error: "Could not mark notification as read",
      });
    }
  };
}
