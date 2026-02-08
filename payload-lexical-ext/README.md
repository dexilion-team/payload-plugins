# @dexilion/payload-lexical-ext

Extended lexical editor features for Payload CMS (Text color, highlight, block background, embeds).

Credit: Adapted from https://github.com/rubn-g/payloadcms-lexical-ext

## Features

- **Text Color** – Customize the color of selected text
- **Text Highlight** – Highlight text with a background color
- **Block Background Color** – Apply background colors to entire blocks of content
- **Embed Videos** – Add embedded YouTube or Vimeo videos to the content of the editor

## Installation

This package is part of the Dexilion workspace and is used internally.

## Usage

```typescript
import {
  BgColorFeature,
  HighlightColorFeature,
  TextColorFeature,
  YoutubeFeature,
  VimeoFeature,
} from "@dexilion/payload-lexical-ext";
import "@dexilion/payload-lexical-ext/client.css";

// In your Payload config:
lexicalEditor({
  features: [
    ...defaultFeatures,
    TextColorFeature(),
    HighlightColorFeature(),
    BgColorFeature(),
    YoutubeFeature(),
    VimeoFeature(),
  ],
});
```

## Configuration Options

Customize colors for text color feature:

```typescript
TextColorFeature({
  colors: [
    {
      type: "button",
      label: "Custom color",
      color: "#1155aa",
    },
  ],
});
```

## License

MIT - Copyright 2025 Dexilion Kft.

Based on [payloadcms-lexical-ext](https://github.com/rubn-g/payloadcms-lexical-ext) by Rubén González.
