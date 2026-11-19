import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectFiltrosTablaProps } from "@/modules/donaciones/types/selectFiltrosTablas";

const SelectFiltrosTablas = ({
  value,
  onClickAction,
  opciones,
  placeholder,
  includeTodasOption,
}: SelectFiltrosTablaProps) => (
  <Select value={value} onValueChange={onClickAction}>
  <SelectTrigger size="sm">
    <SelectValue placeholder={placeholder} />
  </SelectTrigger>
  <SelectContent>
    {includeTodasOption && <SelectItem value="0">Todas</SelectItem>}
    {opciones.map((estado) => (
      <SelectItem key={estado.id} value={estado.id.toString()}>
        {estado.nombre}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

);


export default SelectFiltrosTablas
