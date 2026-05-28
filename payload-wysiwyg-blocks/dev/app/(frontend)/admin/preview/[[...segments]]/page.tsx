import { getPayload } from "payload";
import config from "@payload-config";
import { parseWidgetFields } from "@dexilion/payload-dynamic-blocks/parseWidgetFields";
import { LivePage } from "./LivePage";

type Args = {
  params: Promise<{ segments?: string[] }>;
};

export default async function PreviewPage({ params }: Args) {
  const { segments = [] } = await params;
  const id = segments[0];

  if (!id) {
    return <p style={{ padding: "2rem" }}>No page ID provided.</p>;
  }

  const payload = await getPayload({ config });

  const [page, widgets] = await Promise.all([
    payload.findByID({ collection: "pages", id, disableErrors: true, draft: true }),
    payload.find({ collection: "widgets", pagination: false, disableErrors: true }),
  ]);

  if (!page) {
    return <p style={{ padding: "2rem" }}>Page not found.</p>;
  }

  const widgetFieldMap: Record<string, ReturnType<typeof parseWidgetFields>> = {};
  for (const widget of widgets.docs as any[]) {
    widgetFieldMap[widget.name] = parseWidgetFields(widget.widget ?? "");
  }

  return <LivePage initialData={page as any} widgetFieldMap={widgetFieldMap} />;
}
