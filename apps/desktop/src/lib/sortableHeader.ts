import type { KeyboardEvent } from "react";

export interface SortableHeaderOptions<Field extends string> {
  field: Field;
  activeField: string;
  ascending: boolean;
  onSort: (field: Field) => void;
}

export function sortableHeaderProps<Field extends string>({
  field,
  activeField,
  ascending,
  onSort,
}: SortableHeaderOptions<Field>) {
  return {
    onClick: () => onSort(field),
    onKeyDown: (event: KeyboardEvent<HTMLTableCellElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSort(field);
      }
    },
    tabIndex: 0,
    "aria-sort":
      field === activeField ? (ascending ? "ascending" : "descending") : "none",
  } as const;
}
