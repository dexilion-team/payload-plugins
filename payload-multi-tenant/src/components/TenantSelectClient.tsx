"use client";

import { ReactSelect, type Option } from "@payloadcms/ui/elements/ReactSelect";
import React, { useCallback, useEffect, useState } from "react";

const TENANT_COOKIE_NAME = "payload-tenant-id";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;)\\s*" + name + "\\s*=\\s*([^;]+)"),
  );
  return match ? (match[1]?.trim() ?? null) : null;
}

function setCookieValue(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function TenantSelectClient({
  tenants,
  placeholder,
}: {
  tenants: Option<string>[];
  placeholder?: string;
}) {
  const [selected, _setSelected] = useState<Option<string> | null>(null);
  const [reload, triggerReload] = useState(false);

  useEffect(() => {
    if (reload && selected != null) {
      window?.location.reload();
    }

    if (reload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerReload(false);
    }
  }, [reload, selected]);

  // Load the saved preference from cookie (client-authoritative)
  useEffect(() => {
    const saved = getCookieValue(TENANT_COOKIE_NAME);
    const option =
      (saved
        ? tenants.find((t) => Number(t.id) == Number(saved))
        : null) || tenants[0] || null;
    _setSelected(option);
  }, [tenants]);

  // Callback to set selected tenant
  const setSelected = useCallback(
    (option: Option<string>) => {
      _setSelected(option);
      setCookieValue(TENANT_COOKIE_NAME, String(option.id));
      triggerReload(true);
    },
    [],
  );

  // Handle loading state
  if (tenants.length === 0 || !selected) {
    return null;
  }

  return (
    <div style={{ marginRight: "16px" }}>
      <ReactSelect
        value={{
          ...selected,
          label: selected.value,
        }}
        onChange={(sel) => setSelected(sel as Option<string>)}
        options={tenants.map(
          (tenant) =>
            ({
              id: tenant.id,
              label: tenant.value,
              value: tenant.value,
            }) as Option<string>,
        )}
        isSearchable
        placeholder={placeholder}
        isClearable={false}
        isMulti={false}
        isCreatable={false}
        isSortable={false}
        backspaceRemovesValue={false}
      />
    </div>
  );
}
