"use client";

import { ReactSelect, type Option } from "@payloadcms/ui/elements/ReactSelect";
import { usePreferences } from "@payloadcms/ui";
import React, { useEffect } from "react";

export default function TenantSelectClient({
  tenants,
  placeholder,
}: {
  tenants: Option<string>[];
  placeholder?: string;
}) {
  const { getPreference, setPreference } = usePreferences();
  const [selected, _setSelected] = React.useState<Option<string> | null>(null);
  const [reload, triggerReload] = React.useState(false);

  React.useEffect(() => {
    if (reload && selected != null) {
      window?.location.reload();
    }

    if (reload) {
      triggerReload(false);
    }
  }, [reload, selected]);

  // Load the saved preference
  React.useEffect(() => {
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
  const setSelected = React.useCallback(
    (option: Option<string>) => {
      _setSelected(option);
      setPreference("admin-tenant-select", Number(option.id)).then(() =>
        triggerReload(true),
      );
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
