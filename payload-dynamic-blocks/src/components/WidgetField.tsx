"use client";
import type {
  BlocksFieldClientComponent,
  ClientBlock,
  Validate,
} from "payload";

import { getTranslation } from "@payloadcms/translations";
import React, { Fragment, useCallback, useMemo } from "react";

import {
  Banner,
  BlocksDrawer,
  Button,
  DraggableSortable,
  DraggableSortableItem,
  DrawerToggler,
  ErrorPill,
  FieldDescription,
  FieldError,
  FieldLabel,
  NullifyLocaleField,
  RenderCustomComponent,
  useConfig,
  useDocumentInfo,
  useDrawerSlug,
  useField,
  useLocale,
  useTranslation,
  withCondition,
} from "@payloadcms/ui";
import { scrollToID } from "@payloadcms/ui/utilities/scrollToID";
import { BlockRow } from "./BlockRow";
import { mergeFieldStyles } from "@payloadcms/ui/shared";

const baseClass = "blocks-field";

const BlocksFieldComponent: BlocksFieldClientComponent = (props) => {
  const { i18n, t } = useTranslation();

  const {
    field,
    field: {
      name,
      type,
      admin: { className, description, isSortable = true } = {},
      blockReferences,
      blocks,
      label,
      labels: labelsFromProps,
      localized,
      maxRows,
      minRows: minRowsProp,
      required,
    },
    path: pathFromProps,
    permissions,
    readOnly,
    schemaPath: schemaPathFromProps,
    validate,
  } = props;

  const schemaPath = schemaPathFromProps ?? name;

  const minRows = (minRowsProp ?? required) ? 1 : 0;

  const { code: locale } = useLocale();
  const {
    config: { localization },
    config,
  } = useConfig();
  const drawerSlug = useDrawerSlug("blocks-drawer");

  const labels = {
    plural: t("fields:blocks"),
    singular: t("fields:block"),
    ...labelsFromProps,
  };

  const editingDefaultLocale = (() => {
    if (localization && localization.fallback) {
      const defaultLocale = localization.defaultLocale;
      return locale === defaultLocale;
    }

    return true;
  })();

  // State for blocks
  const [rows, setRows] = React.useState<any[]>([]);
  const submitted = false;
  const dispatchFields = useCallback((action: any) => {
    setRows((prev) => {
      const copy = [...prev];
      switch (action.type) {
        case "DUPLICATE_ROW":
          copy.splice(action.rowIndex + 1, 0, {
            ...copy[action.rowIndex],
            id: Math.random().toString(36).substring(2, 9),
          });
          return copy;
        case "SET_ALL_ROWS_COLLAPSED":
        case "SET_ROW_COLLAPSED":
          return action.updatedRows;
        default:
          return prev;
      }
    });
  }, []);

  const addFieldRow = useCallback(({ blockType, rowIndex }: any) => {
    setRows((prev) => {
      const newRow = {
        id: Math.random().toString(36).substring(2, 9),
        blockType,
        isLoading: false,
      };
      if (typeof rowIndex === "number") {
        const copy = [...prev];
        copy.splice(rowIndex + 1, 0, newRow);
        return copy;
      }
      return [...prev, newRow];
    });
  }, []);

  const removeFieldRow = useCallback(({ rowIndex }: any) => {
    setRows((prev) => prev.filter((_, i) => i !== rowIndex));
  }, []);

  const moveFieldRow = useCallback(({ moveFromIndex, moveToIndex }: any) => {
    setRows((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(moveFromIndex, 1);
      copy.splice(moveToIndex, 0, item);
      return copy;
    });
  }, []);

  const setModified = useCallback((modified: boolean) => {}, []);
  const toggleAllRows = useCallback(({ collapsed, rows }: any) => {
    const updatedRows = rows.map((r: any) => ({ ...r, collapsed }));
    return {
      collapsedIDs: updatedRows
        .filter((r: any) => r.collapsed)
        .map((r: any) => r.id),
      updatedRows,
    };
  }, []);
  const extractRowsAndCollapsedIDs = useCallback(
    ({ collapsed, rowID, rows }: any) => {
      const updatedRows = rows.map((r: any) =>
        r.id === rowID ? { ...r, collapsed } : r,
      );
      return {
        collapsedIDs: updatedRows
          .filter((r: any) => r.collapsed)
          .map((r: any) => r.id),
        updatedRows,
      };
    },
    [],
  );
  const { setDocFieldPreferences } = useDocumentInfo();

  const memoizedValidate = useCallback(
    (value: any, options: any) => {
      // alternative locales can be null
      if (!editingDefaultLocale && value === null) {
        return true;
      }
      if (typeof validate === "function") {
        return validate(value, { ...options, maxRows, minRows, required });
      }
    },
    [maxRows, minRows, required, validate, editingDefaultLocale],
  );

  const {
    blocksFilterOptions,
    customComponents: {
      AfterInput,
      BeforeInput,
      Description,
      Error,
      Label,
    } = {},
    disabled,
    errorPaths = [],
    path,
    showError,
    valid,
    value,
  } = useField<number>({
    hasRows: true,
    potentiallyStalePath: pathFromProps,
    validate: memoizedValidate as Validate,
  });

  const { clientBlocks, clientBlocksAfterFilter } = useMemo(() => {
    let resolvedBlocks: ClientBlock[] = [];

    if (!blockReferences) {
      resolvedBlocks = blocks;
    } else {
      for (const blockReference of blockReferences) {
        const block =
          typeof blockReference === "string"
            ? config.blocksMap[blockReference]
            : blockReference;
        if (block) {
          resolvedBlocks.push(block);
        }
      }
    }

    if (Array.isArray(blocksFilterOptions)) {
      const clientBlocksAfterFilter = resolvedBlocks.filter((block) => {
        const blockSlug = typeof block === "string" ? block : block.slug;
        return blocksFilterOptions.includes(blockSlug);
      });

      return {
        clientBlocks: resolvedBlocks,
        clientBlocksAfterFilter,
      };
    }
    return {
      clientBlocks: resolvedBlocks,
      clientBlocksAfterFilter: resolvedBlocks,
    };
  }, [blockReferences, blocks, blocksFilterOptions, config.blocksMap]);

  const addRow = useCallback(
    (rowIndex: number, blockType?: string) => {
      addFieldRow({
        blockType,
        path,
        rowIndex,
        schemaPath,
      });

      setTimeout(() => {
        scrollToID(`${path}-row-${rowIndex + 1}`);
      }, 0);
    },
    [addFieldRow, path, schemaPath],
  );

  const duplicateRow = useCallback(
    (rowIndex: number) => {
      dispatchFields({ type: "DUPLICATE_ROW", path, rowIndex });
      setModified(true);

      setTimeout(() => {
        scrollToID(`${path}-row-${rowIndex + 1}`);
      }, 0);
    },
    [dispatchFields, path, setModified],
  );

  const removeRow = useCallback(
    (rowIndex: number) => {
      removeFieldRow({
        path,
        rowIndex,
      });
    },
    [path, removeFieldRow],
  );

  const moveRow = useCallback(
    (moveFromIndex: number, moveToIndex: number) => {
      moveFieldRow({ moveFromIndex, moveToIndex, path });
    },
    [moveFieldRow, path],
  );

  const toggleCollapseAll = useCallback(
    (collapsed: boolean) => {
      const { collapsedIDs, updatedRows } = toggleAllRows({
        collapsed,
        rows,
      });

      dispatchFields({ type: "SET_ALL_ROWS_COLLAPSED", path, updatedRows });
      setDocFieldPreferences(path, { collapsed: collapsedIDs });
    },
    [dispatchFields, path, rows, setDocFieldPreferences],
  );

  const setCollapse = useCallback(
    (rowID: string, collapsed: boolean) => {
      const { collapsedIDs, updatedRows } = extractRowsAndCollapsedIDs({
        collapsed,
        rowID,
        rows,
      });

      dispatchFields({ type: "SET_ROW_COLLAPSED", path, updatedRows });
      setDocFieldPreferences(path, { collapsed: collapsedIDs });
    },
    [dispatchFields, path, rows, setDocFieldPreferences],
  );

  const hasMaxRows = !!maxRows && rows.length >= maxRows;

  const fieldErrorCount = errorPaths.length;
  const fieldHasErrors = submitted && fieldErrorCount + (valid ? 0 : 1) > 0;

  const showMinRows = rows.length < minRows || (required && rows.length === 0);
  const showRequired = readOnly && rows.length === 0;

  const styles = useMemo(() => mergeFieldStyles(field), [field]);

  return (
    <div
      className={[
        "field-type",
        baseClass,
        className,
        fieldHasErrors
          ? `${baseClass}--has-error`
          : `${baseClass}--has-no-error`,
      ]
        .filter(Boolean)
        .join(" ")}
      id={`field-${path?.replace(/\./g, "__")}`}
      style={styles}
    >
      {showError && (
        <RenderCustomComponent
          CustomComponent={Error}
          Fallback={<FieldError path={path} showError={showError} />}
        />
      )}
      <header className={`${baseClass}__header`}>
        <div className={`${baseClass}__header-wrap`}>
          <div className={`${baseClass}__heading-with-error`}>
            <h3>
              <RenderCustomComponent
                CustomComponent={Label}
                Fallback={
                  <FieldLabel
                    as="span"
                    label={label}
                    localized={localized}
                    path={path}
                    required={required}
                  />
                }
              />
            </h3>
            {fieldHasErrors && fieldErrorCount > 0 && (
              <ErrorPill count={fieldErrorCount} i18n={i18n} withMessage />
            )}
          </div>
          <ul className={`${baseClass}__header-actions`}>
            {rows.length > 0 && (
              <Fragment>
                <li>
                  <button
                    className={`${baseClass}__header-action`}
                    onClick={() => toggleCollapseAll(true)}
                    type="button"
                  >
                    {t("fields:collapseAll")}
                  </button>
                </li>
                <li>
                  <button
                    className={`${baseClass}__header-action`}
                    onClick={() => toggleCollapseAll(false)}
                    type="button"
                  >
                    {t("fields:showAll")}
                  </button>
                </li>
              </Fragment>
            )}
          </ul>
        </div>
        <RenderCustomComponent
          CustomComponent={Description}
          Fallback={<FieldDescription description={description} path={path} />}
        />
      </header>
      {BeforeInput}
      <NullifyLocaleField
        fieldValue={value}
        localized={localized || false}
        path={path}
        readOnly={readOnly}
      />
      {(rows.length > 0 || (!valid && (showRequired || showMinRows))) && (
        <DraggableSortable
          className={`${baseClass}__rows`}
          ids={rows.map((row) => row.id)}
          onDragEnd={({ moveFromIndex, moveToIndex }) =>
            moveRow(moveFromIndex, moveToIndex)
          }
        >
          {rows.map((row, i) => {
            const { blockType, isLoading } = row;

            const blockConfig: ClientBlock | undefined =
              config.blocksMap[blockType] ??
              clientBlocks.find((block) => block.slug === blockType);

            if (blockConfig) {
              const rowPath = `${path}.${i}`;

              const rowErrorCount = errorPaths.filter((errorPath) =>
                errorPath.startsWith(rowPath + "."),
              ).length;

              return (
                <DraggableSortableItem
                  disabled={readOnly || disabled || !isSortable}
                  id={row.id}
                  key={row.id}
                >
                  {(draggableSortableItemProps) => (
                    <BlockRow
                      {...draggableSortableItemProps}
                      addRow={addRow}
                      block={blockConfig}
                      // Pass all blocks, not just clientBlocksAfterFilter, as existing blocks should still be displayed even if they don't match the new filter
                      blocks={clientBlocks}
                      copyRow={() => {
                        console.log(
                          "Copy row functionality not implemented yet",
                        );
                      }}
                      duplicateRow={duplicateRow}
                      errorCount={rowErrorCount}
                      fields={blockConfig.fields}
                      hasMaxRows={hasMaxRows}
                      isLoading={isLoading}
                      isSortable={isSortable as boolean}
                      Label={rows?.[i]?.customComponents?.RowLabel}
                      labels={labels}
                      moveRow={moveRow}
                      parentPath={path}
                      pasteRow={() => {
                        console.log(
                          "Paste row functionality not implemented yet",
                        );
                      }}
                      path={rowPath}
                      permissions={permissions || true}
                      readOnly={readOnly || disabled}
                      removeRow={removeRow}
                      row={row}
                      rowCount={rows.length}
                      rowIndex={i}
                      schemaPath={schemaPath + blockConfig.slug}
                      setCollapse={setCollapse}
                    />
                  )}
                </DraggableSortableItem>
              );
            }

            return null;
          })}
          {!editingDefaultLocale && (
            <React.Fragment>
              {showMinRows && (
                <Banner type="error">
                  {t("validation:requiresAtLeast", {
                    count: minRows,
                    label:
                      getTranslation(
                        minRows > 1 ? labels.plural : labels.singular,
                        i18n,
                      ) || t(minRows > 1 ? "general:row" : "general:rows"),
                  })}
                </Banner>
              )}
              {showRequired && (
                <Banner>
                  {t("validation:fieldHasNo", {
                    label: getTranslation(labels.plural, i18n),
                  })}
                </Banner>
              )}
            </React.Fragment>
          )}
        </DraggableSortable>
      )}
      {!hasMaxRows && (
        <Fragment>
          <DrawerToggler
            className={`${baseClass}__drawer-toggler`}
            disabled={readOnly || disabled}
            slug={drawerSlug}
          >
            <Button
              buttonStyle="icon-label"
              disabled={readOnly || disabled}
              el="span"
              icon="plus"
              iconPosition="left"
              iconStyle="with-border"
            >
              {t("fields:addLabel", {
                label: getTranslation(labels.singular, i18n),
              })}
            </Button>
          </DrawerToggler>
          <BlocksDrawer
            addRow={addRow}
            addRowIndex={rows?.length || 0}
            // Only allow choosing filtered blocks
            blocks={clientBlocksAfterFilter}
            drawerSlug={drawerSlug}
            labels={labels}
          />
        </Fragment>
      )}
      {AfterInput}
    </div>
  );
};

const BlocksField = withCondition(BlocksFieldComponent);

export default BlocksField;
