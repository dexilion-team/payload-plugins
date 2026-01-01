import { getTenantName } from "@dexilion/payload-multi-tenant";
import { PropsWithChildren } from "react";
import payloadConfig from "@/payload.config";
import { getTheme } from "../getTheme";

export async function Layout({ children }: PropsWithChildren) {
  const tenantName = await getTenantName();

  if (!tenantName) {
    return (
      <html>
        <body>{children}</body>
      </html>
    );
  }

  let theme;
  try {
    theme = await getTheme({
      config: await payloadConfig,
      tenantName,
    });
  } catch {}

  if (!theme || !theme.Layout) {
    return (
      <html>
        <body>{children}</body>
      </html>
    );
  }

  console.warn("Layout must select variant!!!");
  const Layout = await theme.Layout[0].component();

  return <Layout>{children}</Layout>;
}
