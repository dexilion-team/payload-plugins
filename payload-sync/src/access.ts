import type { Access, PayloadHandler, PayloadRequest } from "payload";

import { textResponse } from "./comms";

export const endpointGuard =
  (readAccess: Access | undefined) =>
  (handler: PayloadHandler): PayloadHandler =>
  async (req: PayloadRequest): Promise<Response> => {
    const allowed = readAccess
      ? // User handles access control
        await readAccess({ req })
      : // By default, require any authenticated user (i.e. valid API key)
        Boolean(req.user);
    if (!allowed) {
      return textResponse(
        "Unauthorized. A valid Payload API key is required.",
        401,
      );
    }

    if (!allowed) {
      return textResponse("Forbidden.", 403);
    }

    return handler(req);
  };
