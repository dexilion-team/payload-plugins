"use client";

import type { SanitizedFieldPermissions } from "payload";

import {
  fieldIsHiddenOrDisabled,
  getFieldPaths,
  getFieldPermissions,
} from "payload/shared";
import * as React from "react";

import type { RenderFieldsProps } from "./types";

import { FieldPathContext, useOperation } from "@payloadcms/ui";
import { RenderField } from "./RenderField";

const baseClass = "render-fields";

export { RenderFieldsProps as Props };

export const RenderFields: React.FC<RenderFieldsProps> = (props) => {
  const {
    className,
    fields,
    forceRender,
    margins,
    parentIndexPath,
    parentPath,
    parentSchemaPath,
    permissions,
    readOnly: readOnlyFromParent,
  } = props;

  const operation = useOperation();

  if (fields && fields.length > 0) {
    return (
      <div
        className={[
          baseClass,
          className,
          margins && `${baseClass}--margins-${margins}`,
          margins === false && `${baseClass}--margins-none`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {fields.map((field, i) => {
          if (!field || fieldIsHiddenOrDisabled(field)) {
            return null;
          }

          if (!operation) {
            console.error(
              "Operation is required to render fields. Please ensure that your component is wrapped in an OperationProvider.",
            );
            return null;
          }

          const {
            operation: hasOperationPermission,
            permissions: fieldPermissions,
            read: hasReadPermission,
          } = getFieldPermissions({
            field,
            operation,
            parentName: parentPath?.includes(".")
              ? parentPath.split(".")[parentPath.split(".").length - 1]!
              : parentPath,
            permissions,
          });

          if ("name" in field && !hasReadPermission) {
            return null;
          }

          let isReadOnly = readOnlyFromParent || field?.admin?.readOnly;

          if (isReadOnly && field.admin?.readOnly === false) {
            isReadOnly = false;
          }

          if ("name" in field && !hasOperationPermission) {
            isReadOnly = true;
          }

          const { indexPath, path, schemaPath } = getFieldPaths({
            field,
            index: i,
            parentIndexPath,
            parentPath,
            parentSchemaPath,
          });

          return (
            <FieldPathContext key={`${path}-${i}`} value={path}>
              <RenderField
                clientFieldConfig={field}
                forceRender={forceRender}
                indexPath={indexPath}
                parentPath={parentPath}
                parentSchemaPath={parentSchemaPath}
                path={path}
                permissions={fieldPermissions as SanitizedFieldPermissions}
                readOnly={isReadOnly}
                schemaPath={schemaPath}
              />
            </FieldPathContext>
          );
        })}
      </div>
    );
  }

  return null;
};
