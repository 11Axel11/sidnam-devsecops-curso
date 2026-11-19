import DataTable from "@/components/DataTable"
import type { Actividades } from "../models/voluntario";
import type { ColumnDef } from "@tanstack/react-table";
import type { TablaActividadesProps } from "../types/tablaActividadesProps";
import { useState } from "react";
import FormEditarActividades from "./FormEditarActividades";
import type { EditarActividades } from "../models/accionesExpediente";


const TablaActividades = ({ actividades }: TablaActividadesProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(6);
  const [actividadEditable, setActividadEditable] = useState<EditarActividades | null>(
    null
  );

  const columns: ColumnDef<Actividades>[] = [
    { header: "Fecha", accessorKey: "fecha" },
    { header: "Actividad realizada", accessorKey: "actividades" },
    { header: "Horas cumplidas", accessorKey: "cantidadHoras" },
  ];

  if (!actividades || actividades.length === 0) {
    return (
      <p className="text-center text-gray-500">
        No hay actividades registradas.
        Haz click en el botón "Agregar actividades" para registrar nuevas actividades.
      </p>
    );
  }

  const pagedData = actividades.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  const total = actividades.length;

  const editarActividad = (actividad: Actividades) => {
    setActividadEditable({
      ...actividad,
      id: String(actividad.id),
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
        onRowClick={editarActividad}
      />

      {actividadEditable && (
        <FormEditarActividades
          actividad={actividadEditable}
          onClose={() => setActividadEditable(null)}
        />
      )}
    </div>
  );
};

export default TablaActividades;