import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { format } from "date-fns";
import { ArrowDownAZ, ArrowUpZA, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CalendarFieldProps } from "../modules/residentes/types/CalendarField";
import { es } from "date-fns/locale";

const CalendarField = ({ value, onChange, disableFuture, defaultYearOrder, className }: CalendarFieldProps & { defaultYearOrder?: 'asc' | 'desc' }) => {
  const disabled = disableFuture ? { after: new Date() } : undefined;
  const parseDateLocal = (value?: string) => {
    if (!value) return undefined;
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? undefined : date;
  };

  const [calendarMonth, setCalendarMonth] = useState(parseDateLocal(value) || new Date());
  const [openYear, setOpenYear] = useState(false);
  const [openMonth, setOpenMonth] = useState(false);
  const [yearOrder, setYearOrder] = useState<'asc' | 'desc'>(defaultYearOrder || 'desc');

  const startYear = 1900;
  const currentYear = new Date().getFullYear();
  let years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);
  if (yearOrder === 'desc') years = years.slice().reverse();
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[240px] justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {parseDateLocal(value) ? format(parseDateLocal(value)!, "PPP", { locale: es }) : "Selecciona una fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        side="right"
        align="start"
        sideOffset={5}
      >
        <div className="flex gap-2 justify-evenly items-center">
          <Popover open={openYear} onOpenChange={setOpenYear}>
            <PopoverTrigger asChild>
              <Button variant={"ghost"} className="border rounded text-left">Año</Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-44 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
              side="right"
              align="start"
              sideOffset={5}
            >
              <div className="p-2 flex items-center justify-between border-b">
                <span className="text-sm font-medium ml-1">Orden</span>
                <Button
                  variant="ghost"
                  className="ml-2 "
                  onClick={() => setYearOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title={yearOrder === 'asc' ? 'Orden años: ascendente' : 'Orden años: descendente'}
                  aria-label={yearOrder === 'asc' ? 'Orden años: ascendente' : 'Orden años: descendente'}
                >
                  {yearOrder === 'asc' ? <ArrowUpZA /> : <ArrowDownAZ />}
                  <span className="sr-only">Alternar orden de años</span>
                </Button>
              </div>

              <div className="scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent" style={{ maxHeight: 160, overflowY: 'auto' }}>
                <Command>
                  <CommandGroup>
                    {years.map((y) => (
                      <CommandItem
                        key={y}
                        value={String(y)}
                        onSelect={() => {
                          setCalendarMonth(prev => new Date(y, prev.getMonth(), 1));
                          setOpenYear(false);
                        }}
                        className="cursor-pointer text-black hover:bg-gray-100"
                      >
                        {y}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </div>
            </PopoverContent>
          </Popover>
          <Popover open={openMonth} onOpenChange={setOpenMonth}>
            <PopoverTrigger asChild>
              <Button variant={"ghost"} className="border rounded text-left">Mes</Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-40 scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
              style={{ maxHeight: 200, overflowY: "auto" }}
              side="right"
              align="start"
              sideOffset={5}
            >
              <Command>
                <CommandGroup>
                  {months.map((m) => (
                    <CommandItem
                      key={m}
                      value={String(m)}
                      onSelect={() => {
                        setCalendarMonth(prev => new Date(prev.getFullYear(), m, 1));
                        setOpenMonth(false);
                      }}
                      className="cursor-pointer text-black hover:bg-gray-100"
                    >
                      {m + 1}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Calendar
          mode="single"
          selected={parseDateLocal(value)}
          month={calendarMonth}
          locale={es}
          disabled={disabled}
          onMonthChange={(newMonth) => setCalendarMonth(newMonth)}
          onSelect={(date) => {
            if (!date) return;
            const isoDate = format(date, "yyyy-MM-dd");
            onChange(isoDate);
            setCalendarMonth(date);
          }}
        />
      </PopoverContent>
    </Popover>

  );
};

export default CalendarField;