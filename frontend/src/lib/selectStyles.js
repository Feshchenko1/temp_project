export const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "oklch(var(--b1))",
    borderColor: state.isFocused ? "oklch(var(--p))" : "oklch(var(--bc) / 0.2)",
    color: "oklch(var(--bc))",
    borderRadius: "0.75rem",
    padding: "0.25rem",
    boxShadow: "none",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: "oklch(var(--p))",
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "oklch(var(--b1))",
    borderRadius: "0.75rem",
    border: "1px solid oklch(var(--bc) / 0.1)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected
      ? "oklch(var(--p))"
      : isFocused
        ? "oklch(var(--bc) / 0.1)"
        : "transparent",
    color: isSelected ? "oklch(var(--pc))" : "oklch(var(--bc))",
    cursor: "pointer",
    transition: "all 0.1s ease",
    "&:active": {
      backgroundColor: "oklch(var(--p) / 0.8)",
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: "oklch(var(--bc))",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "oklch(var(--p) / 0.1)",
    borderRadius: "0.5rem",
    color: "oklch(var(--p))",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "oklch(var(--p))",
    fontWeight: "500",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "oklch(var(--p))",
    "&:hover": {
      backgroundColor: "oklch(var(--p) / 0.2)",
      color: "oklch(var(--p))",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "oklch(var(--bc) / 0.5)",
    "&:hover": {
      color: "oklch(var(--bc))",
    },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "oklch(var(--bc) / 0.5)",
    "&:hover": {
      color: "oklch(var(--bc))",
    },
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};
