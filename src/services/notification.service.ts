import { NotificationRepository } from "../repositories/notification.repository";
import { Notification } from "../models/notification.model";
import { CreateNotificationDTO } from "../dtos/create-notification.dto";

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    if (!data.title.trim()) {
      throw new Error("Notification title is required");
    }

    if (!data.message.trim()) {
      throw new Error("Notification message is required");
    }

    return this.notificationRepository.create(data);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findByUserId(userId);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findUnreadByUserId(userId);
  }

  async getNotificationById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(id);

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  }
}
