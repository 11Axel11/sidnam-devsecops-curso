import { useState, useMemo } from "react";
import DataTable from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { useGetFacturasPorProveedor } from "../hooks/proveedoresHooks";
import type { Factura } from "../models/proveedores";
import type { TablaFacturasProps } from "../types/proveedoresTypes";
import { Badge } from "@/components/ui/badge";
import AccionesFacturasCell from "./AccionesFacturasCell";
import { useAuthz } from "@/hooks/useAuth";

const TablaFacturas = ({
  idProveedor,
  facturas,
  totalOverride,
  pageIndexExternal,
  pageSizeExternal,
  onPageIndexChange,
  onPageSizeChange,
  toolbar,
  mostrarSedeProveedor,
}: TablaFacturasProps) => {
  const [pageIndexInternal, setPageIndexInternal] = useState(0);
  const [pageSizeInternal, setPageSizeInternal] = useState(6);

  const pageIndex = pageIndexExternal ?? pageIndexInternal;
  const pageSize = pageSizeExternal ?? pageSizeInternal;
  const setPageIndex = onPageIndexChange ?? setPageIndexInternal;
  const setPageSize = onPageSizeChange ?? setPageSizeInternal;

  const isStatic = Array.isArray(facturas);

  const {
    FacturasProveedor,
    loadingFacturasProveedor,
    errorFacturasProveedor,
    totalFacturasProveedor,
  } = useGetFacturasPorProveedor(idProveedor ?? "", pageIndex + 1, pageSize, {
    enabled: !isStatic && !!idProveedor,
  });

  const rows: Factura[] = isStatic ? (facturas ?? []) : (FacturasProveedor ?? []);
  const total = isStatic ? (totalOverride ?? (facturas?.length ?? 0)) : totalFacturasProveedor;

  const { can, isLoading: loadingPerms } = useAuthz(); 
  const showActions =
    !loadingPerms &&
    (can("Proveduría.Facturas Proveduría:Actualizar") ||
      can("Proveduría.Facturas Proveduría:Eliminar") ||
      can("Proveduría.Facturas Proveduría:Ver"));

  const columns: ColumnDef<Factura>[] = useMemo(() => {
    const base: ColumnDef<Factura>[] = [
      { header: "N° Factura", accessorKey: "numero_factura" },
      ...(mostrarSedeProveedor
        ? ([
            {
              header: "Sede",
              accessorKey: "sede",
              cell: ({ getValue }) => (getValue() === "cecuidam" ? "CECUIDAM" : getValue() === "hogar" ? "Hogar" : "—"),
            },
            { header: "Proveedor", id: "proveedor", cell: ({ row }) => row.original.proveedor?.nombre ?? "—" },
          ] as ColumnDef<Factura>[])
        : []),
      { header: "Fecha de emisión", accessorKey: "fecha_emitida" },
      { header: "Fecha límite de pago", accessorKey: "fecha_pago" },
      {
        header: "Fecha de pago",
        accessorKey: "fecha_pagada",
        cell: ({ getValue }) => (getValue() as string | null | undefined) ?? "—",
      },
      {
        header: "Monto",
        accessorKey: "monto",
        cell: ({ getValue }) =>
          new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" })
            .format(Number(getValue())),
      },
      {
        header: "Estado",
        accessorKey: "estado",
        cell: ({ getValue }) => {
          const estado = String(getValue() ?? "").toLowerCase();
          let variant: "outline" | "accepted" | "pending" | "default" = "default";
          switch (estado) {
            case "pendiente": variant = "pending"; break;
            case "pagada": variant = "accepted"; break;
            default: variant = "outline";
          }
          return <Badge variant={variant} className="capitalize">{estado}</Badge>;
        },
      },
    ];

    if (showActions) {
      base.push({
        id: "acciones",
        header: "Acciones",
        meta: { className: "w-px max-w-none whitespace-nowrap" },
        cell: ({ row }) => <AccionesFacturasCell row={row} />,
      });
    }

    return base;
  }, [showActions, mostrarSedeProveedor]);

  if (!isStatic && loadingFacturasProveedor)
    return <p className="text-center text-muted-foreground">Cargando facturas…</p>;

  if (!isStatic && errorFacturasProveedor)
    return <p className="text-center text-red-700">Ocurrió un error al cargar las facturas.</p>;

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={rows}
        total={total}
        pageIndex={pageIndex}
        pageSize={pageSize}
        setPageIndex={setPageIndex}
        setPageSize={setPageSize}
        emptyMessage={
          <span>
            No hay facturas registradas{idProveedor ? " para este proveedor" : ""}.
            Usa "Agregar factura" para crear una nueva.
          </span>
        }
        toolbar={toolbar} 
      />
    </div>
  );
};

export default TablaFacturas;