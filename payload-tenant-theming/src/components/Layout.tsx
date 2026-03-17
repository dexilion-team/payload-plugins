import type { PropsWithChildren } from "react";
import { getTenantDomain } from "@dexilion/payload-multi-tenant";
import { getTheme } from "../getTheme";
import { SanitizedConfig } from "payload";
import Head from "next/head";

export const Layout = async ({
  payloadConfig,
  themeCssHrefTemplate = `/themes/{{themeName}}/theme.generated.css`,
  children,
}: PropsWithChildren<{
  payloadConfig: Promise<SanitizedConfig>;
  themeCssHrefTemplate?: string;
}>) => {
  let themeHref: string | null = null;

  try {
    const domainName = await getTenantDomain();
    if (domainName) {
      const theme = await getTheme({
        payloadConfig,
        tenantName: domainName,
      });
      themeHref = themeCssHrefTemplate.replace(
        "{{themeName}}",
        encodeURIComponent(theme.name),
      );
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
