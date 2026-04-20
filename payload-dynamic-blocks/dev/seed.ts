import type { Payload } from "payload";

import { devUser } from "./helpers/credentials";

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: "users",
    where: {
      email: {
        equals: devUser.email,
      },
    },
  });

  if (!totalDocs) {
    await payload.create({
      collection: "users",
      data: devUser,
    });
  }

  payload.logger.info("   ");
  payload.logger.info("+-----------------------------------------------------");
  payload.logger.info("|   ");
  payload.logger.info("|   Log into the admin dashboard with: ");
  payload.logger.info(`|      Email:    ${devUser.email}`);
  payload.logger.info(`|      Password: ${devUser.password}`);
  payload.logger.info("|   ");
  payload.logger.info("+-----------------------------------------------------");
  payload.logger.info("   ");
};
