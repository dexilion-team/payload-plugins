import type { Payload } from "payload";

import { devUser } from "./helpers/credentials";
import { CollectionSlug } from "payload";

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: "users",
    where: {
      email: {
        equals: devUser.email,
      },
    },
  });

  let userId: string;

  if (!totalDocs) {
    const user = await payload.create({
      collection: "users",
      data: devUser,
    });
    userId = user.id as string;
  } else {
    const { docs } = await payload.find({
      collection: "users",
      where: { email: { equals: devUser.email } },
    });
    userId = docs[0]?.id as string;
  }

  // Ensure admin role exists and is assigned to devUser
  const { totalDocs: adminRoleExists } = await payload.count({
    collection: "roles" as CollectionSlug,
    where: { role: { equals: "admin" } },
  });

  if (!adminRoleExists) {
    await payload.create({
      collection: "roles" as CollectionSlug,
      data: {
        role: "admin",
        users: [userId],
        permissions: {
          posts: { read: true, create: true, update: true, delete: true },
          media: { read: true, create: true, update: true, delete: true },
          users: { read: true, create: true, update: true, delete: true },
        },
      } as any,
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
