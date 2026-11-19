import { useState, useMemo } from "react";
import DataTable from "@/components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { Proveedores } from "../models/proveedores";
import { useGetProveedores } from "../hooks/proveedoresHooks";
import type { TablaProveedoresProps } from "../types/proveedoresTypes";
import { useNavigate } from "@tanstack/react-router";
import AccionesProveedorCell from "./AccionesProveedorCell";
import { useAuthz } from "@/hooks/useAuth";

const TablaProveedores = ({ idArea }: TablaProveedoresProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const navigate = useNavigate();
  const { can } = useAuthz();

  const {
    Proveedores: proveedores,
    loadingProveedores,
    errorProveedores,
  } = useGetProveedores(idArea);

  const showActions = can("Proveduría.General Proveduría:Actualizar")
    || can("Proveduría.General Proveduría:Eliminar");

  const columns: ColumnDef<Proveedores>[] = useMemo(() => {
    const base: ColumnDef<Proveedores>[] = [
      { header: "Nombre", accessorKey: "nombre" },
      {
        header: "Número",
        accessorKey: "numero",
        cell: ({ getValue }) => String(getValue() ?? ""),
      },
      { header: "Dirección", accessorKey: "direccion" },
      { header: "Correo", accessorKey: "correo" },
    ];

    if (showActions) {
      base.push({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => <AccionesProveedorCell row={row} />,
      });
    }

    return base;
  }, [showActions]);

  if (loadingProveedores) {
    return <p className="text-center text-muted-foreground">Cargando proveedores…</p>;
  }

  if (errorProveedores) {
    return (
      <p className="text-center text-red-700">
        Ocurrió un error al cargar los proveedores.
      </p>
    );
  }

  if (!proveedores || proveedores.length === 0) {
    return (
      <p className="text-center mt-5 text-gray-500">
        No hay proveedores registrados para esta área.
        Usa “Agregar proveedor” para crear uno nuevo.
      </p>
    );
  }

  const total = proveedores.length;
  const pagedData = proveedores.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  const gotoFacturasProveedor = (prov: Proveedores) => {
    navigate({
      to: "/proveeduria/$idAreaProv/$idProveedor",
      params: {
        idAreaProv: String(idArea),
        idProveedor: String(prov.id_proveedor),
      },
    });
  };

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={pagedData}
        total={total}
        pageIndex={pageIndex}
        pageSize={pageSize}
        setPageIndex={setPageIndex}
        setPageSize={setPageSize}
        onRowClick={gotoFacturasProveedor}
      />
    </div>
  );
};

export default TablaProveedores;