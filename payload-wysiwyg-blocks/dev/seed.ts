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
        name: "all-fields",
        widget:
          `<>\n` +
          `  <Text name="title" label="Title" required />\n` +
          `  <Email name="email" label="Email" />\n` +
          `  <Textarea name="summary" label="Summary" />\n` +
          `  <Number name="count" label="Count" />\n` +
          `  <Checkbox name="published" label="Published" />\n` +
          `  <Date name="publishedAt" label="Published At" />\n` +
          `  <Select name="status" label="Status" options={[{"label":"Draft","value":"draft"},{"label":"Published","value":"published"},{"label":"Archived","value":"archived"}]} />\n` +
          `  <Radio name="layout" label="Layout" options={[{"label":"Full Width","value":"full"},{"label":"Sidebar","value":"sidebar"}]} />\n` +
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
