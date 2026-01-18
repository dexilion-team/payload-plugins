import { SelectField } from "@payloadcms/ui";
import getThemeName from "../../utils/getThemeName";

/**
 * Custom select component for layout variant with async theme filtering
 */
const LayoutVariantSelect = async (props: any) => {
  const { path, field, req, i18n } = props;
  const themeName = await getThemeName({ req });

  const options = field.options.filter((option: { value: string }) =>
    option.value.startsWith(`${themeName}-`),
  );

  return (
    <SelectField
      field={{
        name: field.name,
        label: field.label({ t: req.t, i18n }),
        options,
        required: field.required,
      }}
      path={path}
    />
  );
};

export default LayoutVariantSelect;
