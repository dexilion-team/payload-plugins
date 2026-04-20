import { ClientBlock, Config, createClientBlocks, Endpoint } from "payload";

export const createBlocksEndpoint = (config: Config): Endpoint => ({
  path: "/blocks",
  method: "get",
  handler: async (req) => {
    const payload = req.payload;

    const blocks: ClientBlock[] = createClientBlocks({
      blocks: [
        {
          slug: "exampleBlock",
          labels: {
            singular: "Example Block",
            plural: "Example Blocks",
          },
          dbName: "exampleBlock",
          fields: [
            {
              name: "text",
              type: "text",
              label: "Text",
            },
          ],
        },
      ],
      i18n: req.i18n,
      defaultIDType: config.db.defaultIDType,
      importMap: payload.importMap,
    }) as ClientBlock[];

    return Response.json({ blocks });
  },
});
