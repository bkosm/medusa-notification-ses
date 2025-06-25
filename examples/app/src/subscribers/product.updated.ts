import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { CreateNotificationDTO } from "@medusajs/framework/types";

const EVENT = "product.updated" as const;

export type ProductUpdatedArgs = {
  id: string; // id of the product
};

export default async function handler({
  event: {
    data: { id: productId },
  },
  container,
}: SubscriberArgs<ProductUpdatedArgs>) {
  const products = container.resolve(Modules.PRODUCT);

  const product = await products.retrieveProduct(productId);

  const notifications = container.resolve(Modules.NOTIFICATION);

  const notification: CreateNotificationDTO = {
    receiver_id: product.id,
    to: process.env.ADMIN_EMAIL!,
    channel: "email",
    template: "product-updated",
    trigger_type: EVENT,
    content: {
      subject: "Product was updated!",
    },
    data: {
      productName: product.title
    }
  };

  await notifications.createNotifications(notification);
}

export const config: SubscriberConfig = {
  event: EVENT,
};
