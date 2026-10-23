function getLabel(
  value: string,
  options: { label: string, value: string }[],
): string | undefined {
  const option = options.find((opt) => opt.value === value);
  return option?.label;
}

export default getLabel;
