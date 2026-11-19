import DataTable from "@/components/DataTable";
import { useGetEntradasMedicamentos } from "../hooks/inventarioHooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import WebLoader from "@/components/Loader";
import type { ColumnDef } from "@tanstack/react-table";
import type { RegistroEntradaMedicamento } from "../models/inventario";

const TablaEntradasMedicamentos = () => {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number | undefined>(new Date().getFullYear());

    const {entradasMedicamentos, totalEntradasMedicamentos, loadingEntradasMedicamentos, fetchingEntradasMedicamentos, errorEntradasMedicamentos} = 
        useGetEntradasMedicamentos(selectedYear ?? new Date().getFullYear(), selectedMonth ?? new Date().getMonth() + 1, pageIndex + 1, pageSize);

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const monthName = format(new Date(2020, i, 1), 'MMMM', { locale: es });
        const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return {
            value: (i + 1).toString(),
            label: capitalizedMonth
        };
    });
      
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => ({
        value: (currentYear - i).toString(),
        label: (currentYear - i).toString()
    }));
        
    const toolbar = (
          <div className="flex gap-2">
              <Select
                  value={selectedMonth?.toString()}
                  onValueChange={(value) => {
                    setSelectedMonth(Number(value));
                    setPageIndex(0);
                  }}
              >
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                      {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                              {month.label}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Select
                  value={selectedYear?.toString()}
                  onValueChange={(value) => {
                    setSelectedYear(Number(value));
                    setPageIndex(0);
                  }}
              >
                  <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                      {yearOptions.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                              {year.label}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
        )
        
        const columns: ColumnDef<RegistroEntradaMedicamento>[] = [
            { 
                header: "Nombre", 
                accessorKey: "nombreMedicamento",
                cell: ({ getValue }) => {
                  const value = getValue() as string;
                  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
                }
              },
          {
            header: "Unidad de medida", 
            accessorKey: "nombreUnidad",
            cell: ({row}) => {
              return row.original.nombreUnidad + ' (' + row.original.abreviaturaUnidad +')'
            }
          },
          { header: "Cantidad", accessorKey: "cantidad" },
          { 
            header: "Fecha", 
            accessorKey: "fecha",
            cell: ({ row }) => {
              const date = new Date(row.original.fecha);
              return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        ];
    
        if (loadingEntradasMedicamentos || fetchingEntradasMedicamentos || errorEntradasMedicamentos) {
          return <><WebLoader/></>
        }

    return (
        <div>
            <DataTable
                columns={columns}
                data={entradasMedicamentos}
                total={totalEntradasMedicamentos}
                pageIndex={pageIndex}
                pageSize={pageSize}
                setPageIndex={setPageIndex}
                setPageSize={setPageSize}
                toolbar={toolbar}
            />
        </div>
    );
};

export default TablaEntradasMedicamentos;
