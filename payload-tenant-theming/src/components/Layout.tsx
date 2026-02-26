import type { PropsWithChildren } from "react";
import { getTenantName } from "@dexilion/payload-multi-tenant";
import { getTheme } from "../getTheme";
import { SanitizedConfig } from "payload";
import Head from "next/head";

export const Layout = async ({
  payloadConfig,
  children,
}: PropsWithChildren<{ payloadConfig: Promise<SanitizedConfig> }>) => {
  let themeHref: string | null = null;
  let themeCss: string | null = null;

  try {
    const tenantName = await getTenantName();
    if (tenantName) {
      const theme = await getTheme({
        payloadConfig,
        tenantName,
      });
      themeHref = `/themes/${encodeURIComponent(theme.name)}/theme.generated.css`;
      themeCss = `/api/theme.css?${encodeURIComponent(theme.name)}`;
      // themeHref =
      //   process.env.NODE_ENV === "production"
      //     ? `/${encodeURIComponent(theme.name)}/global.css`
      //     : `/api/theme.css?${encodeURIComponent(theme.name)}`;
    }
  } catch {}

  return (
    <html>
      <head>
        {themeCss ? <link rel="stylesheet" href={themeCss} /> : null}
        {themeHref ? <link rel="stylesheet" href={themeHref} /> : null}
      </head>
      <body>{children}</body>
    </html>
  );
};
