import type { PropsWithChildren } from "react";
import payloadConfig from "@/payload.config";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { getTheme } from "../getTheme";

export const Layout = async ({ children }: PropsWithChildren) => {
  let themeHref: string | null = null;

  try {
    const tenantName = await getTenantName();
    if (tenantName) {
      const theme = await getTheme({
        config: await payloadConfig,
        tenantName,
      });
      themeHref = `/api/theme.css?${encodeURIComponent(theme.name)}`;
    }
  } catch {}

  return (
    <html>
      <head>
        {themeHref ? <link rel="stylesheet" href={themeHref} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
};
