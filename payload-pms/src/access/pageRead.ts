import { Access } from "payload";

const pageRead: Access = async ({ req }) => {
  const user = req?.user;
  if (!user) {
    return {
      or: [{ _status: { equals: "published" } }],
    };
  }

  return true;
};

export default pageRead;
