import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarIcon, Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { MonthPicker } from "./ui/month-picker";
import { toast } from "sonner";

interface DescargarReportePopoverProps {
  onDownload: (month: Date) => Promise<void> | void;
  buttonText?: string;
  popoverTitle?: string;
  fromYear?: number;
  toYear?: number;
  className?: string;
  successMessage?: string;
  errorMessage?: string;
}

export function DescargarReportePopover({
  onDownload,
  buttonText = "Descargar reporte",
  popoverTitle = "Seleccionar mes",
  fromYear = 2020,
  toYear = new Date().getFullYear(),
  className = "",
  successMessage = "Reporte generado exitosamente",
  errorMessage = "Error al generar el reporte",
}: DescargarReportePopoverProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDownload = async () => {
    if (!selectedMonth) return;
    
    try {
      setIsDownloading(true);
      
      await onDownload(selectedMonth);
      
      toast.success(successMessage, {
        duration: 5000,
      });
    } catch (error) {
      toast.error(errorMessage, {
        duration: 5000,
      });
      console.error('Error generating report:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="read" className={className}>
          <Download className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-4">
        <h4 className="font-medium text-sm">{popoverTitle}</h4>
        <Popover open={open} onOpenChange={setOpen}>
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
              onClose={() => setOpen(false)}
              fromYear={fromYear}
              toYear={toYear}
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
                  {buttonText}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}