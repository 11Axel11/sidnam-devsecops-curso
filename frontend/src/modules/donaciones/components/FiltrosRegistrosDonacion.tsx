import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, CalendarIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import type { FiltrarRegistrosParams } from '../models/registroDonacion';
import { DateRangePicker } from '@/components/DateRangePicker';

type FilterFields = Omit<FiltrarRegistrosParams, 'page' | 'limit'>;

const EMPTY: FilterFields = {
  search:      '',
  recibida:    'all',
  fechaInicio: '',
  fechaFin:    '',
};

interface Props {
  onFilter: (params: FilterFields) => void;
}

export function FiltroRegistrosDonacion({ onFilter }: Props) {
  const [form, setForm]         = useState<FilterFields>(EMPTY);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [open, setOpen]         = useState(false);

  const set = (key: keyof FilterFields) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setForm((prev) => ({
        ...prev,
        fechaInicio: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
        fechaFin:    range?.to   ? format(range.to,   'yyyy-MM-dd') : '',
    }));

    if (
        range?.from &&
        range?.to &&
        range.from.toDateString() !== range.to.toDateString()
    ) {
        setOpen(false);
    }
    };

  const handleSearch = () =>
    onFilter({
      ...form,
      recibida: form.recibida === 'all' ? '' : form.recibida,
    });

  const handleClear = () => {
    setForm(EMPTY);
    setDateRange(undefined);
    onFilter({ search: '', recibida: '', fechaInicio: '', fechaFin: '' });
  };

  // 'all' is always truthy so exclude it from the "has active filters" check
  const hasActiveFilters =
    !!form.search || (!!form.recibida && form.recibida !== 'all') ||
    !!form.fechaInicio || !!form.fechaFin;

  const dateLabel = (() => {
    if (dateRange?.from && dateRange?.to)
      return `${format(dateRange.from, 'dd MMM', { locale: es })} – ${format(dateRange.to, 'dd MMM yyyy', { locale: es })}`;
    if (dateRange?.from)
      return format(dateRange.from, 'dd MMM yyyy', { locale: es });
    return 'Rango de fechas';
  })();

  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      {/* Free-text search */}
      <div className="relative min-w-60">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 w-full max-w-65"
          placeholder="Buscar por tipo de donación..."
          value={form.search}
          onChange={(e) => set('search')(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>

      {/* Recibida select */}
      <Select value={form.recibida} onValueChange={set('recibida')}>
        <SelectTrigger className="w-30">
          <SelectValue placeholder="Estado de recepción" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="true">Recibidas</SelectItem>
          <SelectItem value="false">Pendientes</SelectItem>
        </SelectContent>
      </Select>

      {/* Date range picker */}
      <Popover open={open}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-46 justify-start font-normal ${
              !dateRange ? 'text-muted-foreground' : ''
            }`}
            onClick={() => setOpen((prev) => !prev)}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
            ref={popoverRef}
            className="w-auto p-0"
            align="start"
            onInteractOutside={(e) => {
                // Only close if the click is genuinely outside the popover
                if (!popoverRef.current?.contains(e.target as Node)) {
                setOpen(false);
                }
            }}
            onEscapeKeyDown={() => setOpen(false)}
        >
            <DateRangePicker
                selected={dateRange ?? { from: undefined, to: undefined }}
                setSelected={handleDateSelect}
            />
            {dateRange?.from && (
                <div className="border-t p-2 flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                    setDateRange(undefined);
                    setForm((prev) => ({ ...prev, fechaInicio: '', fechaFin: '' }));
                    }}
                >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar fechas
                </Button>
                </div>
            )}
        </PopoverContent>
      </Popover>

      {/* Search button */}
      <Button variant="read" onClick={handleSearch}>
        <Search className="h-4 w-4" />
        Buscar
      </Button>

      {/* Clear all filters */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={handleClear}>
          <X className="h-4 w-4" />
          Limpiar
        </Button>
      )}
    </div>
  );
}