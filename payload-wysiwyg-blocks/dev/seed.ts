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
          `  <RichText name="body" label="Body" defaultValue={{"root":{"type":"root","format":"","indent":0,"version":1,"children":[{"type":"paragraph","format":"","indent":0,"version":1,"children":[{"type":"text","format":0,"style":"","mode":"normal","detail":0,"text":"Click here to edit...","version":1}],"textFormat":0,"textStyle":"","direction":"ltr"}],"direction":"ltr"}}} />\n` +
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
