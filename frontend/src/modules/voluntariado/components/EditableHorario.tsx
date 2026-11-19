import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Horario } from "../models/voluntario";
import type { EditableHorarioProps, EditarHorario } from "../types/editarVoluntarioProps";
import { Button } from "@/components/ui/button";
import { Label } from "@radix-ui/react-label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Clock, Plus } from "lucide-react";
import { useDeleteHorarioVoluntario } from "../hooks/gestionVoluntariado/gestionHooks";
import { toast } from "sonner";
import { useConfirmModalStore } from "@/store/modalStore";
import { generarHoras } from "../functions/horas";

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const EditableHorario = ({ horarios, onChange, onServerMutated }: EditableHorarioProps) => {
  const horaMin = 7;
  const horaMax = 17;
  const openModal = useConfirmModalStore((state) => state.openModal);
  const [localHorarios, setLocalHorarios] = useState<EditarHorario[]>(horarios);
  const [editId, setEditId] = useState<number | null>(null);
  const deleteMutation = useDeleteHorarioVoluntario();
  const [editValues, setEditValues] = useState<{ dia: string; horaInicio: string; horaFin: string }>({
    dia: "",
    horaInicio: "",
    horaFin: "",
  });

  const [adding, setAdding] = useState(false);
  const [newValues, setNewValues] = useState<{ dia: string; horaInicio: string; horaFin: string }>({
    dia: "",
    horaInicio: "",
    horaFin: "",
  });

  const confirmarEliminar = (id: number) => {
    openModal(
      "Esta acción eliminará permanentemente el día. Si fue un error, deberás volver a ingresar el día de asistencia manualmente. ¿Deseas continuar?",
      () => eliminarHorarioConfirmado(id),  // onConfirm
      () => { }, // onCancel (opcional)
      "destructive" // variante botón confirmar
    );
  };

  const eliminarHorarioConfirmado = (id: number) => {
    deleteMutation.mutate(
      { idHorario: id },
      {
        onSuccess: () => {
          const nuevos = localHorarios.filter((h) => h.id !== id);
          setLocalHorarios(nuevos);
          onChange(nuevos);
          onServerMutated?.(nuevos);

          toast.success(nuevos.length ? "Horario eliminado" : "Se eliminaron todos los horarios");
        },
        onError: () => toast.error("Error al eliminar el horario"),
      }
    );
  };


  useEffect(() => {
    setLocalHorarios(horarios);
  }, [horarios]);

  const calcularPorcentaje = (horaStr: string) => {
    const [h, m] = horaStr.split(":").map(Number);
    const horaDecimal = h + m / 60;
    return ((horaDecimal - horaMin) / (horaMax - horaMin)) * 100;
  };

  const startEdit = (horario: Horario) => {
    setEditId(horario.id);
    setEditValues({
      dia: horario.dia,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
    });
    setAdding(false);
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = () => {
    if (!editId) return;
    if (!editValues.dia || !editValues.horaInicio || !editValues.horaFin) return;
    if (editValues.horaFin <= editValues.horaInicio) return;

    const nuevos = localHorarios.map((h) =>
      h.id === editId ? { ...h, ...editValues } : h
    );
    setLocalHorarios(nuevos);
    onChange(nuevos);
    setEditId(null);
  };

  const handleChange = (key: "dia" | "horaInicio" | "horaFin", val: string) => {
    setEditValues((ev) => ({ ...ev, [key]: val }));
  };

  const handleNewChange = (key: "dia" | "horaInicio" | "horaFin", val: string) => {
    setNewValues((nv) => ({ ...nv, [key]: val }));
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewValues({ dia: "", horaInicio: "", horaFin: "" });
  };

  const saveNew = () => {
    if (!newValues.dia || !newValues.horaInicio || !newValues.horaFin) return;
    if (newValues.horaFin <= newValues.horaInicio) return;

    const nuevoHorario = {
      dia: newValues.dia,
      horaInicio: newValues.horaInicio,
      horaFin: newValues.horaFin,
    };

    const nuevos = [...localHorarios, nuevoHorario];
    setLocalHorarios(nuevos);
    onChange(nuevos);
    setAdding(false);
    setNewValues({ dia: "", horaInicio: "", horaFin: "" });
  };

  const diasUsados = localHorarios.map((h) => h.dia);
  if (editId && editValues.dia) {
    diasUsados.splice(diasUsados.indexOf(editValues.dia), 1);
  }
  const diasDisponibles = dias.filter((d) => !diasUsados.includes(d));

  const horas = generarHoras();
  const horasFinEditFiltradas = editValues.horaInicio
    ? horas.filter((h) => h > editValues.horaInicio)
    : horas;
  const horasFinNewFiltradas = newValues.horaInicio
    ? horas.filter((h) => h > newValues.horaInicio)
    : horas;

  return (
    <div className="w-full mx-auto">
      <div className="flex text-sm font-semibold mb-2 pl-[100px]">
        {Array.from({ length: horaMax - horaMin }, (_, i) => (
          <div key={i} className="flex-1 text-center border-l border-gray-300">
            {horaMin + i <= 12 ? `${horaMin + i} AM` : `${horaMin + i - 12} PM`}
          </div>
        ))}
      </div>

      {/* editar un horario actual */}
      {localHorarios.map((h) => {

        if (editId === h.id) {
          return (
            <div key={h.id} className="flex items-center gap-4 mb-4 ">
              <div className="w-[100px] font-medium ">
                <Select value={editValues.dia} onValueChange={(v) => handleChange("dia", v)}>
                  <SelectTrigger className=" px-2 py-1 cursor-pointer">
                    <SelectValue placeholder="Seleccionar día" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Días disponibles</SelectLabel>
                      {dias.map((d) => (
                        <SelectItem
                          className="cursor-pointer"
                          key={d}
                          value={d}
                          disabled={diasUsados.includes(d)}
                        >
                          {d}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

              </div>

              <div className="flex items-center gap-3 w-full bg-gray-100 rounded pl-2">
                <Label>Hora de inicio: </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-24 justify-between text-black border border-gray-300"
                    >
                      {editValues.horaInicio || "--:--"}
                      <Clock size={18} className="text-black" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-40 
                    scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
                    style={{ maxHeight: 200, overflowY: "auto" }}
                  >
                    <Command>
                      <CommandGroup>
                        {horas.map((time) => (
                          <CommandItem
                            key={time}
                            value={time}
                            onSelect={(value) => handleChange("horaInicio", value)}
                            className="cursor-pointer text-black hover:bg-gray-100"
                          >
                            {time}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <Label>Hora de fin: </Label>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-24 justify-between text-black border border-gray-300"
                      disabled={!editValues.horaInicio}
                    >
                      {editValues.horaFin || "--:--"}
                      <Clock size={18} className="text-black" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-40 
                    scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
                    style={{ maxHeight: 200, overflowY: "auto" }}
                  >
                    <Command>
                      <CommandGroup>
                        {horasFinEditFiltradas.map((time) => (
                          <CommandItem
                            key={time}
                            value={time}
                            onSelect={(value) => handleChange("horaFin", value)}
                            className="cursor-pointer text-black hover:bg-gray-100"
                          >
                            {time}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  onClick={saveEdit}
                  variant={"approve"}
                  className=" cursor-pointer"
                  disabled={!editValues.dia || editValues.horaFin <= editValues.horaInicio}
                  type="button"
                >
                  Guardar
                </Button>
                <Button
                  onClick={cancelEdit}
                  variant={"outline"}
                  className="cursor-pointer"
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => confirmarEliminar(editId!)}
                  variant="destructive"
                  className="cursor-pointer"
                  type="button"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={h.id}
            className="group flex items-center gap-4 mb-4 cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-gray-50"
            title="Haz clic para editar este horario"
            onClick={() => h.id !== undefined ? startEdit(h as Horario) : undefined}
          >
            <div className="w-[100px] font-medium">{h.dia}</div>
            <div className="relative w-full h-6 bg-gray-100 rounded overflow-hidden transition-all group-hover:bg-gray-200">
              <div
                className="absolute top-0 bottom-0 bg-amaranthPink-800 rounded-lg transition-opacity group-hover:opacity-90"
                style={{
                  left: `${calcularPorcentaje(h.horaInicio)}%`,
                  width: `${calcularPorcentaje(h.horaFin) - calcularPorcentaje(h.horaInicio)}%`,
                }}
              />
              <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm group-hover:block">
                Haz clic para editar
              </span>
            </div>
          </div>
        );
      })}

      {!adding && (
        <div className="mb-6">
          <Button
            onClick={() => {
              setAdding(true);
              setEditId(null);
              setNewValues({ dia: "", horaInicio: "", horaFin: "" });
            }}
            variant={"create"}
            disabled={diasDisponibles.length === 0}
            type="button"
          >
            <Plus /> Agregar horario
          </Button>
          {diasDisponibles.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">Todos los días ya fueron agregados.</p>
          )}
        </div>
      )}

      {/* agregando un nuevo dia / horario */}
      {adding && (
        <div className="flex items-center gap-4 mb-4 rounded ">
          <div>
            <Select value={newValues.dia} onValueChange={(v) => handleNewChange("dia", v)}>
              <SelectTrigger className="border rounded py-1 ">
                <SelectValue placeholder="Seleccionar día" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-justify">Días disponibles</SelectLabel>
                  {diasDisponibles.map((d) => (
                    <SelectItem className="cursor-pointer" key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-24 justify-between text-black border border-gray-300"
              >
                {newValues.horaInicio || "--:--"}
                <Clock size={18} className="text-black" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-40 
              scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
              style={{ maxHeight: 200, overflowY: "auto" }}
            >
              <Command>
                <CommandGroup>
                  {horas.map((time) => (
                    <CommandItem
                      key={time}
                      value={time}
                      onSelect={(value) => handleNewChange("horaInicio", value)}
                      className="cursor-pointer text-black hover:bg-gray-100"
                    >
                      {time}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-24 justify-between text-black border border-gray-300"
                disabled={!newValues.horaInicio}
              >
                {newValues.horaFin || "--:--"}
                <Clock size={18} className="text-black" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-40 
                    scrollbar-thin scrollbar-thumb-ecruYellow scrollbar-track-transparent"
              style={{ maxHeight: 200, overflowY: "auto" }}
            >
              <Command>
                <CommandGroup>
                  {horasFinNewFiltradas.map((time) => (
                    <CommandItem
                      key={time}
                      value={time}
                      onSelect={(value) => handleNewChange("horaFin", value)}
                      className="cursor-pointer text-black hover:bg-gray-100"
                    >
                      {time}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            onClick={saveNew}
            className="cursor-pointer"
            variant={"create"}
            disabled={
              !newValues.dia ||
              !newValues.horaInicio ||
              !newValues.horaFin ||
              newValues.horaFin <= newValues.horaInicio
            }
            type="button"
          >
            Guardar
          </Button>
          <Button
            onClick={cancelAdd}
            variant={"outline"}
            className=" cursor-pointer"
            type="button"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditableHorario;
