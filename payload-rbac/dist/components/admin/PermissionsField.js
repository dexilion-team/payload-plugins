"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useMemo } from "react";
import { FieldDescription, FieldError, FieldLabel, RenderCustomComponent, fieldBaseClass, useConfig, useField } from "@payloadcms/ui";
const baseClass = "permissions-matrix-field";
const actions = [
    "read",
    "create",
    "delete",
    "update"
];
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function coerceMatrix(value) {
    if (typeof value === "string") {
        try {
            return coerceMatrix(JSON.parse(value));
        } catch  {
            return {};
        }
    }
    if (!isRecord(value)) return {};
    const matrix = {};
    for (const [collectionSlug, maybeRow] of Object.entries(value)){
        if (!isRecord(maybeRow)) continue;
        matrix[collectionSlug] = {
            read: Boolean(maybeRow.read),
            create: Boolean(maybeRow.create),
            update: Boolean(maybeRow.update),
            delete: Boolean(maybeRow.delete)
        };
    }
    return matrix;
}
function buildMatrix(args) {
    const fromValue = coerceMatrix(args.value);
    const allSlugs = Array.from(new Set([
        ...args.collectionSlugs,
        ...Object.keys(fromValue)
    ])).sort();
    const matrix = {};
    for (const slug of allSlugs){
        const existing = fromValue[slug];
        matrix[slug] = {
            read: Boolean(existing?.read),
            create: Boolean(existing?.create),
            update: Boolean(existing?.update),
            delete: Boolean(existing?.delete)
        };
    }
    return matrix;
}
const PermissionsField = (props)=>{
    const { field, path: pathFromProps, readOnly } = props;
    const { config } = useConfig();
    const collectionSlugs = useMemo(()=>{
        const slugs = (config?.collections || [])// Exclude internal Payload collections
        .filter((collection)=>!collection.slug.startsWith("payload-")).map((collection)=>collection.slug).filter(Boolean);
        return Array.from(new Set(slugs)).sort();
    }, [
        config?.collections
    ]);
    const fieldAdmin = field?.admin;
    const className = typeof fieldAdmin?.className === "string" ? fieldAdmin.className : undefined;
    const description = fieldAdmin?.description;
    const label = field?.label;
    const localized = field?.localized;
    const required = field?.required;
    const { customComponents: { AfterInput, BeforeInput, Description, Error, Label } = {}, disabled, initialValue, path, setValue, showError, value } = useField({
        potentiallyStalePath: typeof pathFromProps === "string" ? pathFromProps : undefined
    });
    const matrix = useMemo(()=>buildMatrix({
            collectionSlugs,
            value: value ?? initialValue
        }), [
        collectionSlugs,
        initialValue,
        value
    ]);
    const setPermission = useCallback((collectionSlug, action, enabled)=>{
        if (readOnly || disabled) return;
        const currentRow = matrix[collectionSlug] || {
            read: false,
            create: false,
            update: false,
            delete: false
        };
        const next = {
            ...matrix,
            [collectionSlug]: {
                ...currentRow,
                [action]: enabled
            }
        };
        setValue(next);
    }, [
        disabled,
        matrix,
        readOnly,
        setValue
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: [
            fieldBaseClass,
            baseClass,
            className,
            showError && "error",
            (readOnly || disabled) && "read-only"
        ].filter(Boolean).join(" "),
        children: [
            /*#__PURE__*/ _jsx(RenderCustomComponent, {
                CustomComponent: Label,
                Fallback: /*#__PURE__*/ _jsx(FieldLabel, {
                    label: label,
                    localized: localized,
                    path: path,
                    required: required
                })
            }),
            /*#__PURE__*/ _jsxs("div", {
                className: `${fieldBaseClass}__wrap`,
                children: [
                    /*#__PURE__*/ _jsx(RenderCustomComponent, {
                        CustomComponent: Error,
                        Fallback: /*#__PURE__*/ _jsx(FieldError, {
                            path: path,
                            showError: showError
                        })
                    }),
                    BeforeInput,
                    /*#__PURE__*/ _jsx("div", {
                        style: {
                            overflowX: "auto"
                        },
                        children: /*#__PURE__*/ _jsxs("table", {
                            style: {
                                width: "100%",
                                borderCollapse: "collapse"
                            },
                            children: [
                                /*#__PURE__*/ _jsx("thead", {
                                    children: /*#__PURE__*/ _jsxs("tr", {
                                        children: [
                                            /*#__PURE__*/ _jsx("th", {
                                                style: {
                                                    textAlign: "left",
                                                    padding: "6px 8px",
                                                    borderBottom: "1px solid var(--theme-elevation-150)"
                                                },
                                                children: "Collection"
                                            }),
                                            actions.map((action)=>/*#__PURE__*/ _jsx("th", {
                                                    style: {
                                                        textAlign: "center",
                                                        padding: "6px 8px",
                                                        borderBottom: "1px solid var(--theme-elevation-150)",
                                                        width: 92
                                                    },
                                                    children: action
                                                }, action))
                                        ]
                                    })
                                }),
                                /*#__PURE__*/ _jsx("tbody", {
                                    children: collectionSlugs.map((collectionSlug)=>/*#__PURE__*/ _jsxs("tr", {
                                            children: [
                                                /*#__PURE__*/ _jsx("td", {
                                                    style: {
                                                        padding: "6px 8px",
                                                        borderBottom: "1px solid var(--theme-elevation-50)"
                                                    },
                                                    children: /*#__PURE__*/ _jsx("code", {
                                                        children: collectionSlug
                                                    })
                                                }),
                                                actions.map((action)=>/*#__PURE__*/ _jsx("td", {
                                                        style: {
                                                            textAlign: "center",
                                                            padding: "6px 8px",
                                                            borderBottom: "1px solid var(--theme-elevation-50)"
                                                        },
                                                        children: /*#__PURE__*/ _jsx("input", {
                                                            "aria-label": `${collectionSlug}:${action}`,
                                                            checked: Boolean(matrix?.[collectionSlug]?.[action]),
                                                            disabled: Boolean(readOnly || disabled),
                                                            onChange: (e)=>setPermission(collectionSlug, action, e.target.checked),
                                                            type: "checkbox"
                                                        })
                                                    }, action))
                                            ]
                                        }, collectionSlug))
                                })
                            ]
                        })
                    }),
                    AfterInput
                ]
            }),
            /*#__PURE__*/ _jsx(RenderCustomComponent, {
                CustomComponent: Description,
                Fallback: /*#__PURE__*/ _jsx(FieldDescription, {
                    description: description,
                    path: path
                })
            })
        ]
    });
};
export default PermissionsField;

//# sourceMappingURL=PermissionsField.js.map