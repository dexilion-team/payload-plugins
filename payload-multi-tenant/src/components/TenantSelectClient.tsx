"use client";

import { usePreferences } from "@payloadcms/ui";
import { ReactSelect, type Option } from "@payloadcms/ui/elements/ReactSelect";
import React, { useCallback, useEffect, useState } from "react";

export default function TenantSelectClient({
  tenants,
  placeholder,
}: {
  tenants: Option<string>[];
  placeholder?: string;
}) {
  const { getPreference, setPreference } = usePreferences();
  const [selected, _setSelected] = useState<Option<string> | null>(null);
  const [reload, triggerReload] = useState(false);

  useEffect(() => {
    if (reload && selected != null) {
      window?.location.reload();
    }

    if (reload) {
      triggerReload(false);
    }
  }, [reload, selected]);

  // Load the saved preference
  useEffect(() => {
    (async function () {
      const saved = await getPreference<number | undefined>(
        "admin-tenant-select",
      );
      const option =
        tenants.find((t) => Number(t.id) == saved) || tenants[0] || null;
      _setSelected(option);
    })();
  }, [getPreference, tenants]);

  // Callback to set selected tenant
  const setSelected = useCallback(
    (option: Option<string>) => {
      _setSelected(option);
      setPreference("admin-tenant-select", Number(option.id)).then(() => {
        triggerReload(true);
      });
    },
    [setPreference],
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
