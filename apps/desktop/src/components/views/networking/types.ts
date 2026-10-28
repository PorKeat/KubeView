import type * as React from "react";
import type { StatusBeaconVariant } from "@/components/ui";

export interface NetworkingColumn<T> {
  key: string;
  label: string;
  widthClass?: string;
  sortValue?: (item: T) => string | number;
  render: (item: T) => React.ReactNode;
}

export interface NetworkingFilterOption {
  id: string;
  label: string;
  count: number;
  warn?: boolean;
}

export interface NetworkingStatusDescriptor {
  label: string;
  variant: StatusBeaconVariant;
  pulse?: boolean;
}

export interface NetworkingResourcePageProps<T> {
  icon: React.ElementType;
  nounSingular: string;
  nounPlural: string;
  items: T[];
  totalCount: number;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  onRefresh: () => void;
  searchPlaceholder: string;
  matchesSearch: (item: T, query: string) => boolean;
  filterOptions: NetworkingFilterOption[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  matchesFilter: (item: T, filter: string) => boolean;
  columns: NetworkingColumn<T>[];
  getKey: (item: T) => string;
  getName: (item: T) => string;
  getNamespace: (item: T) => string;
  getStatus: (item: T) => NetworkingStatusDescriptor;
  getAge: (item: T) => string;
  getCreationTimestamp: (item: T) => string;
  onRowClick: (item: T) => void;
  describeCommand: (item: T) => string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onDiagnose?: (item: T) => void;
  onCreate?: () => void;
  testIdPrefix: string;
  clusterScoped?: boolean;
  includeClusterScoped?: boolean;
  autoRefresh?: boolean;
  emptyDescription?: string;
  codeCommand?: (namespace: string) => string;
}
