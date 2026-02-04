"use client";

import React, { useCallback, useMemo } from "react";
import type { FieldClientComponent, StaticDescription } from "payload";

import {
  FieldDescription,
  FieldError,
  FieldLabel,
  RenderCustomComponent,
  fieldBaseClass,
  useConfig,
  useField,
} from "@payloadcms/ui";

const baseClass = "permissions-matrix-field";

const actions = ["read", "create", "delete", "update"] as const;
export type PermissionAction = (typeof actions)[number];
type PermissionsMatrix = Record<string, Record<PermissionAction, boolean>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function coerceMatrix(value: unknown): PermissionsMatrix {
  if (typeof value === "string") {
    try {
      return coerceMatrix(JSON.parse(value));
    } catch {
      return {};
    }
  }

  if (!isRecord(value)) return {};

  const matrix: PermissionsMatrix = {};

  for (const [collectionSlug, maybeRow] of Object.entries(value)) {
    if (!isRecord(maybeRow)) continue;

    matrix[collectionSlug] = {
      read: Boolean(maybeRow.read),
      create: Boolean(maybeRow.create),
      update: Boolean(maybeRow.update),
      delete: Boolean(maybeRow.delete),
    };
  }

  return matrix;
}

function buildMatrix(args: {
  collectionSlugs: string[];
  value: unknown;
}): PermissionsMatrix {
  const fromValue = coerceMatrix(args.value);
  const allSlugs = Array.from(
    new Set([...args.collectionSlugs, ...Object.keys(fromValue)]),
  ).sort();

  const matrix: PermissionsMatrix = {};
  for (const slug of allSlugs) {
    const existing = fromValue[slug];
    matrix[slug] = {
      read: Boolean(existing?.read),
      create: Boolean(existing?.create),
      update: Boolean(existing?.update),
      delete: Boolean(existing?.delete),
    };
  }

  return matrix;
}

const PermissionsField: FieldClientComponent = (props) => {
  const { field, path: pathFromProps, readOnly } = props;
  const { config } = useConfig();

  const collectionSlugs = useMemo(() => {
    const slugs = (config?.collections || [])
      // Exclude internal Payload collections
      .filter((collection) => !collection.slug.startsWith("payload-"))
      .map((collection) => collection.slug)
      .filter(Boolean);

    return Array.from(new Set(slugs)).sort();
  }, [config?.collections]);

  const fieldAdmin = (field as any)?.admin as
    | Record<string, unknown>
    | undefined;
  const className =
    typeof fieldAdmin?.className === "string"
      ? fieldAdmin.className
      : undefined;
  const description = fieldAdmin?.description as StaticDescription | undefined;

  const label = (field as any)?.label;
  const localized = (field as any)?.localized;
  const required = (field as any)?.required;

  const {
    customComponents: {
      AfterInput,
      BeforeInput,
      Description,
      Error,
      Label,
    } = {},
    disabled,
    initialValue,
    path,
    setValue,
    showError,
    value,
  } = useField<unknown>({
    potentiallyStalePath:
      typeof pathFromProps === "string" ? pathFromProps : undefined,
  });

  const matrix = useMemo(
    () => buildMatrix({ collectionSlugs, value: value ?? initialValue }),
    [collectionSlugs, initialValue, value],
  );

  const setPermission = useCallback(
    (collectionSlug: string, action: PermissionAction, enabled: boolean) => {
      if (readOnly || disabled) return;

      const currentRow = matrix[collectionSlug] || {
        read: false,
        create: false,
        update: false,
        delete: false,
      };

      const next: PermissionsMatrix = {
        ...matrix,
        [collectionSlug]: {
          ...currentRow,
          [action]: enabled,
        },
      };

      setValue(next);
    },
    [disabled, matrix, readOnly, setValue],
  );

  return (
    <div
      className={[
        fieldBaseClass,
        baseClass,
        className,
        showError && "error",
        (readOnly || disabled) && "read-only",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <RenderCustomComponent
        CustomComponent={Label}
        Fallback={
          <FieldLabel
            label={label}
            localized={localized}
            path={path}
            required={required}
          />
        }
      />

      <div className={`${fieldBaseClass}__wrap`}>
        <RenderCustomComponent
          CustomComponent={Error}
          Fallback={<FieldError path={path} showError={showError} />}
        />

        {BeforeInput}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid var(--theme-elevation-150)",
                  }}
                >
                  Collection
                </th>
                {actions.map((action) => (
                  <th
                    key={action}
                    style={{
                      textAlign: "center",
                      padding: "6px 8px",
                      borderBottom: "1px solid var(--theme-elevation-150)",
                      width: 92,
                    }}
                  >
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collectionSlugs.map((collectionSlug) => (
                <tr key={collectionSlug}>
                  <td
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid var(--theme-elevation-50)",
                    }}
                  >
                    <code>{collectionSlug}</code>
                  </td>
                  {actions.map((action) => (
                    <td
                      key={action}
                      style={{
                        textAlign: "center",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--theme-elevation-50)",
                      }}
                    >
                      <input
                        aria-label={`${collectionSlug}:${action}`}
                        checked={Boolean(matrix?.[collectionSlug]?.[action])}
                        disabled={Boolean(readOnly || disabled)}
                        onChange={(e) =>
                          setPermission(
                            collectionSlug,
                            action,
                            e.target.checked,
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {AfterInput}
      </div>

      <RenderCustomComponent
        CustomComponent={Description}
        Fallback={<FieldDescription description={description} path={path} />}
      />
    </div>
  );
};

export default PermissionsField;
