import type {
  ColumnDef,
} from '@tanstack/react-table';
import type React from 'react';
import type { Dispatch } from 'react';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[],
  total?: number,
  pageIndex?: number,
  pageSize?: number,
  isRowRead?: (row: TData) => boolean;
  onRowClick?: (row: TData) => void;
  setPageIndex?: Dispatch<React.SetStateAction<number>>;
  setPageSize?: Dispatch<React.SetStateAction<number>>;
  action?: (row: TData) => void;
  toolbar?: React.ReactElement | null,
  showPagination?: boolean,
  emptyMessage?: React.ReactNode
}