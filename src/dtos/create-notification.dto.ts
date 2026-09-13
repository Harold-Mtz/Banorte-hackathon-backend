export interface CreateNotificationDTO {
  userId: string;

  goalId?: string;

  title: string;

  message: string;

  read?: boolean;
}
