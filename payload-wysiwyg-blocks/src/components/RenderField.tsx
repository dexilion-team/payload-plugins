"use client";

import type {
  ClientComponentProps,
  ClientField,
  FieldPaths,
  SanitizedFieldPermissions,
} from "payload";

import { useState } from "react";
import {
  HiddenField,
  ArrayField,
  BlocksField,
  CheckboxField,
  CodeField,
  CollapsibleField,
  DateTimeField,
  EmailField,
  GroupField,
  JoinField,
  JSONField,
  NumberField,
  PointField,
  RadioGroupField,
  RelationshipField,
  RowField,
  SelectField,
  TabsField,
  TextField,
  TextareaField,
  UIField,
  UploadField,
  useFormFields,
} from "@payloadcms/ui";
import { RichText } from "@dexilion/payload-pms/RichText";

type RenderFieldProps = {
  clientFieldConfig: ClientField;
  permissions: SanitizedFieldPermissions;
} & FieldPaths &
  Pick<ClientComponentProps, "forceRender" | "readOnly" | "schemaPath">;

function RichTextPreviewField({
  path,
  editorComponent,
}: {
  path: string;
  editorComponent: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const value = useFormFields(([fields]) => fields?.[path]?.value);

  if (editing) {
    return (
      <div className="wysiwyg-editor-inline">
        <button
          className="wysiwyg-editor-inline__close"
          onClick={() => setEditing(false)}
        >
          ✕
        </button>
        {editorComponent}
      </div>
    );
  }

  return (
    <div
      className="wysiwyg-preview__richtext"
      onClick={() => setEditing(true)}
    >
      {value ? (
        <RichText content={value as any} />
      ) : (
        <p className="wysiwyg-preview__placeholder">Click to edit…</p>
      )}
    </div>
  );
}

export function RenderField({
  clientFieldConfig,
  forceRender,
  indexPath,
  parentPath,
  parentSchemaPath,
  path,
  permissions,
  readOnly,
  schemaPath,
}: RenderFieldProps) {
  const CustomField = useFormFields(
    ([fields]) => fields && fields?.[path]?.customComponents?.Field,
  );

  const baseFieldProps: Pick<
    ClientComponentProps,
    "forceRender" | "permissions" | "readOnly" | "schemaPath"
  > = {
    forceRender,
    permissions,
    readOnly,
    schemaPath,
  };

  if (clientFieldConfig.admin?.hidden) {
    return <HiddenField {...baseFieldProps} path={path} />;
  }

  if (CustomField !== undefined && clientFieldConfig.type !== "richText") {
    return CustomField || null;
  }

  if (clientFieldConfig.type === "richText") {
    return (
      <RichTextPreviewField
        path={path}
        editorComponent={CustomField ?? null}
      />
    );
  }

  const iterableFieldProps = {
    ...baseFieldProps,
    indexPath,
    parentPath,
    parentSchemaPath,
  };

  switch (clientFieldConfig.type) {
    case "array":
      return (
        <ArrayField
          {...iterableFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "blocks":
      return (
        <BlocksField
          {...iterableFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "checkbox":
      return (
        <CheckboxField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "code":
      return (
        <CodeField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "collapsible":
      return (
        <CollapsibleField
          {...iterableFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "date":
      return (
        <DateTimeField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "email":
      return (
        <EmailField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "group":
      return (
        <GroupField
          {...iterableFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "join":
      return (
        <JoinField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "json":
      return (
        <JSONField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "number":
      return (
        <NumberField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "point":
      return (
        <PointField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "radio":
      return (
        <RadioGroupField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "relationship":
      return (
        <RelationshipField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "row":
      return <RowField {...iterableFieldProps} field={clientFieldConfig} />;

    case "select":
      return (
        <SelectField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "tabs":
      return (
        <TabsField
          {...iterableFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "text":
      return (
        <TextField {...baseFieldProps} field={clientFieldConfig} path={path} />
      );

    case "textarea":
      return (
        <TextareaField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );

    case "ui":
      return <UIField />;

    case "upload":
      return (
        <UploadField
          {...baseFieldProps}
          field={clientFieldConfig}
          path={path}
        />
      );
  }
}
