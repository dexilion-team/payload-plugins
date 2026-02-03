import React from "react";

import { serializeLexical } from "./serialize";

const RichText: React.FC<{
  className?: string;
  content: any;
  enableGutter?: boolean;
  opts?: {
    uploadCaption?: boolean;
  };
}> = ({ className, content, opts }) => {
  if (!content) {
    return null;
  }

  return (
    <div className={[className].filter(Boolean).join(" ")}>
      {content &&
        !Array.isArray(content) &&
        typeof content === "object" &&
        "root" in content &&
        serializeLexical({ nodes: content?.root?.children, opts })}
    </div>
  );
};

export default RichText;
