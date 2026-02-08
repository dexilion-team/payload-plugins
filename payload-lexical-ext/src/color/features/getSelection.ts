import {
  $getSelection,
  $isRangeSelection,
  BaseSelection,
} from "@payloadcms/richtext-lexical/lexical";

export default (selection: BaseSelection | null = null) => {
  selection ||= $getSelection();
  if ($isRangeSelection(selection)) {
    return selection;
  }

  return null;
};
