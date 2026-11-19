import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthPicker } from "@/components/ui/month-picker";
import { toast } from "sonner";
import { useGetEstadosFacturas, useGetReporteFacturasPorMesYEstado } from "../hooks/proveedoresHooks";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import SedeToggle from "@/components/SedeToggle";
import type { Sede } from "@/store/sedeStore";

export function DescargarReporteMesEstado() {
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [isDownloading, setIsDownloading] = useState(false);

  const [selectedEstado, setSelectedEstado] = useState<string>("0");
  const [selectedSede, setSelectedSede] = useState<Sede | "ambas">("ambas");

  const { estadoFactura } = useGetEstadosFacturas();

  const nombreEstado = selectedEstado === "0" ? "Todas" : estadoFactura?.find((estado) => estado.id === Number(selectedEstado))?.nombre+"s";

  const { mutateAsync: descargarReporteMesEstado } = useGetReporteFacturasPorMesYEstado();

  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const handleDownload = async () => {
  if (!selectedMonth) return;
  
  try {
    setIsDownloading(true);
    const estado = selectedEstado ? Number(selectedEstado) : 0;
    
    await descargarReporteMesEstado({
      anio: selectedMonth.getFullYear(), 
      mes: selectedMonth.getMonth() + 1, 
      estado: estado,
      nombreEstado: nombreEstado,
      sede: selectedSede === "ambas" ? undefined : selectedSede,
    });
    
    toast.success("Reporte generado exitosamente", { duration: 5000 });
  } catch (err: any) {
    let errorMessage = err.response?.status === 404
      ? "No hay facturas para el período y filtros seleccionados"
      : "Error en el servidor, por favor intenta más tarde";

    // Si la respuesta es un Blob, hay que leerlo como texto primero
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        errorMessage = json.message || json.error || errorMessage;
      } catch {
        // Si no se puede parsear, usar mensaje genérico
      }
    } else {
      errorMessage = err.response?.data?.message || err.message || errorMessage;
    }

    toast.error(errorMessage, { duration: 5000 });
    console.error('Error generating report:', err);
  } finally {
    setIsDownloading(false);
  }
};

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="read">
          <Download className="mr-2 h-4 w-4" />
          Descargar reporte
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-4">
        <h4 className="font-medium text-sm">Seleccionar sede</h4>
        <SedeToggle
          opciones={["ambas", "hogar", "cecuidam"] as (Sede | "ambas")[]}
          value={selectedSede}
          onChange={setSelectedSede}
        />
        <h4 className="font-medium text-sm">Seleccionar estado</h4>
        <RadioGroup 
  className="space-y-3"
  value={selectedEstado} 
  onValueChange={setSelectedEstado}
>
  <div className="space-y-2">
    <div className="space-y-2 pl-1">
      <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
        <RadioGroupItem value="0" id="todos" className="h-4 w-4" />
        <Label htmlFor="todos" className="text-sm font-normal text-gray-700 cursor-pointer">
          Todas las facturas
        </Label>
      </div>
      {estadoFactura?.map((estado) => (
        <div 
          key={estado.id} 
          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
        >
          <RadioGroupItem 
            value={String(estado.id)} 
            id={`estado-${estado.id}`} 
            className="h-4 w-4"
          />
          <Label 
            htmlFor={`estado-${estado.id}`} 
            className="text-sm font-normal text-gray-700 cursor-pointer"
          >
            {estado.nombre}s
          </Label>
        </div>
      ))}
    </div>
  </div>
</RadioGroup>
        <h4 className="font-medium text-sm">Seleccionar mes</h4>
        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-10"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedMonth 
                ? format(selectedMonth, 'MMMM yyyy', { locale: es })
                : "Seleccionar mes"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <MonthPicker
              selected={selectedMonth}
              onSelect={setSelectedMonth}
              onClose={() => setMonthPickerOpen(false)}
              fromYear={2020}
              toYear={new Date().getFullYear()}
            />
          </PopoverContent>
        </Popover>
        <motion.div
          initial={false}
          animate={isDownloading ? 'downloading' : 'idle'}
          variants={{
            idle: { scale: 1 },
            downloading: { scale: 0.95 },
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="w-full"
        >
          <Button 
            variant="read"
            className="w-full h-9 relative overflow-hidden"
            disabled={!selectedMonth || isDownloading}
            onClick={handleDownload}
          >
            <AnimatePresence mode="wait">
              {isDownloading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center"
                >
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando reporte...
                </motion.span>
              ) : (
                <motion.span
                  key="default"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar reporte
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}