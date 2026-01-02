"use client";

import { BlocksField, useField } from "@payloadcms/ui";

export default function ContentBuilder(args: any) {
  const { value, setValue } = useField({ path: "contentBuilder" });
  console.log(Object.keys(args));

  return <BlocksField path="content" field={{}} />;
}
