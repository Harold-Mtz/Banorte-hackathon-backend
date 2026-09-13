export interface Notification {
  id: string;

  userId: string;

  goalId: string | null;

  title: string;

  message: string;

  read: boolean;

  createdAt: Date;
}
