export function enumToDropdown<T extends Record<string, string>>(
  enumObj: T,
  customOverrides?: Partial<Record<T[keyof T], string>>,
) {
  return Object.values(enumObj).map((val) => {
    const autoLabel = val
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const label = customOverrides?.[val as T[keyof T]] || autoLabel;

    return {
      key: val,
      value: label,
    };
  });
}
