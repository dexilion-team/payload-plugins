import { createServerFeature } from "@payloadcms/richtext-lexical";
import type { ColorFeatureProps } from "../../types";

export const HighlightColorFeature = createServerFeature<
  ColorFeatureProps,
  ColorFeatureProps,
  ColorFeatureProps
>({
  feature({ props }) {
    return {
      ClientFeature:
        "@dexilion/payload-lexical-ext/client#HighlightColorFeatureClient",
      clientFeatureProps: {
        colors: props?.colors,
      },
    };
  },
  key: "highlightColor",
});
