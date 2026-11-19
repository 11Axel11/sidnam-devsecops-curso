
import { type DateRange } from "react-day-picker";
import { Calendar } from "./ui/calendar";
import { es } from "date-fns/locale";

export function DateRangePicker({
    selected,
    setSelected
}: {
    selected: DateRange;
    setSelected: (selected: DateRange | undefined) => void;
}) {
  return (
    <Calendar
      locale={es}
      mode="range"
      selected={selected}
      onSelect={setSelected}
    />
  );
}