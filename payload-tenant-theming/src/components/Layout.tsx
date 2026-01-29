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

  try {
    const tenantName = await getTenantName();
    if (tenantName) {
      const theme = await getTheme({
        payloadConfig,
        tenantName,
      });
      themeHref = `/api/theme.css?${encodeURIComponent(theme.name)}`;
    }
  } catch {}

  return (
    <html>
      <Head>
        {themeHref ? <link rel="stylesheet" href={themeHref} /> : null}
      </Head>
      <body>{children}</body>
    </html>
  );
};
