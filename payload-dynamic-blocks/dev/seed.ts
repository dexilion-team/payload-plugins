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

  const { totalDocs: widgetCount } = await payload.count({
    collection: "widgets",
  });

  if (!widgetCount) {
    await payload.create({
      collection: "widgets",
      data: {
        name: "basic",
        widget:
          `<>\n` +
          `  <Text name="title" label="Title" required />\n` +
          `  <RichText name="body" label="Body" />\n` +
          `  <Relationship name="image" label="Image" relationTo="media" />\n` +
          `</>`,
      },
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
