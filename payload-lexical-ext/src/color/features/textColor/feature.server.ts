import { createServerFeature } from "@payloadcms/richtext-lexical";
import type { ColorFeatureProps } from "../../types";

export const TextColorFeature = createServerFeature<
  ColorFeatureProps,
  ColorFeatureProps,
  ColorFeatureProps
>({
  feature({ props }) {
    return {
      ClientFeature:
        "@dexilion/payload-lexical-ext/client#TextColorFeatureClient",
      clientFeatureProps: {
        colors: props?.colors,
      },
    };
  },
  key: "textColor",
});
