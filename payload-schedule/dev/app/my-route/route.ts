import configPromise from "@payload-config";
import { getPayload } from "payload";

export const GET = async () => {
  const payload = await getPayload({ config: configPromise });

  await payload.jobs.queue({ task: "publishScheduled", input: {} });
  const result = await payload.jobs.run();

  return Response.json({ result });
};
