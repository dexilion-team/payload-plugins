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

  console.log("   ");
  console.log("+-----------------------------------------------------");
  console.log("|   ");
  console.log("|   Log into the admin dashboard with: ");
  console.log(`|      Email:    ${devUser.email}`);
  console.log(`|      Password: ${devUser.password}`);
  console.log("|   ");
  console.log("+-----------------------------------------------------");
  console.log("   ");
};
