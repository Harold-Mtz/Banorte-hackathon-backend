import { Router } from "express";

import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationService } from "../services/notification.service";
import { NotificationController } from "../controllers/notification.controller";

const router = Router();

/*
 * Dependencies
 */
const notificationRepository = new NotificationRepository();

const notificationService = new NotificationService(notificationRepository);

const notificationController = new NotificationController(notificationService);

/*
 * Routes
 */

router.get("/", notificationController.getUserNotifications);

router.get("/unread", notificationController.getUnreadNotifications);

router.patch("/:id/read", notificationController.markAsRead);

export default router;
