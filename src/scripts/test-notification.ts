import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationService } from "../services/notification.service";
import { pool } from "../config/database";

async function main() {
  const repository = new NotificationRepository();

  const service = new NotificationService(repository);

  try {
    const notification = await service.createNotification({
      // PON AQUÍ UN USER ID REAL
      userId: "11111111-1111-1111-1111-111111111111",

      // Puedes utilizar la meta que ya creamos
      goalId: "191f08f4-86dc-4fcd-95b8-82816d7ef19b",

      title: "Tu meta necesita atención",

      message:
        "Te recomendamos continuar con tu ahorro para mantenerte en camino hacia tu meta.",
    });

    console.log("Notification created successfully:");

    console.log(notification);

    const notifications = await service.getUserNotifications(
      "11111111-1111-1111-1111-111111111111",
    );

    console.log("\nUser notifications:");

    console.log(notifications);
  } catch (error) {
    console.error("Notification test failed:", error);
  } finally {
    await pool.end();
  }
}

main();
