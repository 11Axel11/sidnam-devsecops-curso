import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  useCreateNotaEnfermeria,
  useCreateConsultaEspecialista,
  useCreateCuracion,
  useCreateConsultaEBAIS,
  useGetTiposConsultaEspecialista
} from "../../hooks/enfermeria/enfermeriaHooks";
import { useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useBitacoraStore } from "../../store/bitacorasStore";
import type {
  CrearNotas,
  CrearConsultaEspecialista,
} from "../../models/enfermeria";
import { Plus } from "lucide-react";
import RichTextEditor from "./RichTextEditor";

// Configuración para cada tipo de bitácora (adaptado a tu numeración actual)
const BITACORA_CONFIG = {
  1: { // Consultas Especialista
    title: 'Agregar Consulta Especialista',
    description: 'Ingresa el título y el contenido de la nueva consulta especialista.',
    queryKey: 'consultasEspecialista'
  },
  2: { // Consultas EBAIS
    title: 'Agregar Consulta EBAIS',
    description: 'Ingresa el título y el contenido de la nueva consulta EBAIS.',
    queryKey: 'consultasEBAIS'
  },
  3: { // Curaciones
    title: 'Agregar Curación',
    description: 'Ingresa el título y el contenido de la nueva curación.',
    queryKey: 'curaciones'
  },
  4: { // Notas de Enfermería
    title: 'Agregar Nota de Enfermería',
    description: 'Ingresa el título y el contenido de la nueva nota de enfermería.',
    queryKey: 'notasEnfermeria'
  }
} as const;

const FormCrearBitacora = () => {
  const [open, setOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [tipoConsultaFormulario, setTipoConsultaFormulario] = useState<number | null>(null);
  const { id } = useParams({ from: "/residentes/$id/enfermeria/bitacoras" });
  const { tipoSeleccionado, setTipoSeleccionado } = useBitacoraStore();
  const { TipoConsulta } = useGetTiposConsultaEspecialista();
  const queryClient = useQueryClient();

  const createNotaEnfermeria = useCreateNotaEnfermeria();
  const createConsultaEspecialista = useCreateConsultaEspecialista();
  const createCuracion = useCreateCuracion();
  const createConsultaEBAIS = useCreateConsultaEBAIS();

  const form = useForm({
    defaultValues: { titulo: "", textoCompleto: "" },
    onSubmit: async ({ value }) => {
      if (!tipoSeleccionado) {
        toast.error("Selecciona un tipo de bitácora primero");
        return;
      }

      if (tipoSeleccionado === 1 && !tipoConsultaFormulario) {
        toast.error("Debes seleccionar un tipo de consulta especialista");
        setFormErrors({ tipoConsulta: "Debes seleccionar un tipo de consulta especialista" });
        return;
      }

      setFormErrors({});
      try {
        const currentDate = new Date().toISOString().split('T')[0];

        switch (tipoSeleccionado) {
          case 1: // Consultas Especialista
            await createConsultaEspecialista.mutateAsync({
              idTipo: tipoConsultaFormulario!,
              idExpediente: Number(id),
              nota: {
                titulo: value.titulo,
                descripcion: value.textoCompleto,
                fecha_consulta: currentDate
              } as CrearConsultaEspecialista
            });
            break;

          case 2: // Consultas EBAIS
            await createConsultaEBAIS.mutateAsync({
              idExpediente: Number(id),
              nota: {
                titulo: value.titulo,
                descripcion: value.textoCompleto,
                fecha_consulta: currentDate
              } as unknown as CrearNotas
            });
            break;

          case 3: // Curaciones
            await createCuracion.mutateAsync({
              idExpediente: Number(id),
              nota: {
                titulo: value.titulo,
                descripcion: value.textoCompleto,
                fecha_curacion: currentDate
              } as unknown as CrearNotas
            });
            break;

          case 4: // Notas de Enfermería
            await createNotaEnfermeria.mutateAsync({
              idExpediente: Number(id),
              nota: {
                titulo: value.titulo,
                textoCompleto: value.textoCompleto
              } as CrearNotas
            });
            break;

          default:
            toast.error("Tipo de bitácora no válido");
            return;
        }

        toast.success("Registro agregado correctamente");
        form.reset();
        setFormErrors({});
        setTipoConsultaFormulario(null);
        setOpen(false);

        await setTipoSeleccionado(tipoSeleccionado, Number(id));

        if (currentConfig) {
          queryClient.invalidateQueries({
            queryKey: [currentConfig.queryKey, Number(id)]
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error creating record:', err);

        if (err.errors) {
          const errors: Record<string, string> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          err.errors.forEach((e: any) => {
            if (e.path?.[0]) errors[e.path[0]] = e.message;
          });
          setFormErrors(errors);
        } else if (err.message && Array.isArray(err.message)) {
          // Manejar errores del tipo que mostraste
          const serverError = err.message.join(', ');
          toast.error(`Error de validación: ${serverError}`);
          setFormErrors({ server: serverError });
        } else {
          toast.error("Error en el servidor, intenta más tarde");
          setFormErrors({ server: "Error en el servidor" });
        }
      }
    },
  });

  const currentConfig = tipoSeleccionado && BITACORA_CONFIG[tipoSeleccionado as keyof typeof BITACORA_CONFIG];

  // Resetear el formulario cuando cambia la categoría
  useEffect(() => {
    form.reset();
    setFormErrors({});
    setTipoConsultaFormulario(null);
  }, [form, tipoSeleccionado]);

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      form.reset();
      setTipoConsultaFormulario(null);
      setFormErrors({});

      if (currentConfig) {
        queryClient.invalidateQueries({
          queryKey: [currentConfig.queryKey, Number(id)]
        });
      }
    }
  };

  const config = currentConfig || {
    title: 'Agregar Bitácora',
    description: 'Selecciona un tipo de bitácora para continuar.'
  };

  const isDisabled = !tipoSeleccionado;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="create"
          disabled={isDisabled}
          title={isDisabled ? "Selecciona un tipo de bitácora primero" : "Agregar registro"}
        >
          <Plus /> Agregar registro
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-2xl mx-auto my-6 sm:my-12 max-h-[80vh] overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      >
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4 px-2 sm:px-4"
        >
          {tipoSeleccionado === 1 && TipoConsulta && (
            <div>
              <Label htmlFor="tipoConsulta" className="mb-1 block">
                Tipo de Consulta Especialista:
              </Label>
              <Select
                value={tipoConsultaFormulario?.toString() || ""}
                onValueChange={(value) => {
                  const selectedId = Number(value);
                  setTipoConsultaFormulario(selectedId);
                  if (formErrors.tipoConsulta) {
                    setFormErrors(prev => ({ ...prev, tipoConsulta: '' }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de consulta" />
                </SelectTrigger>
                <SelectContent>
                  {TipoConsulta.map((tipo) => (
                    <SelectItem
                      key={tipo.id_tipo_consulta}
                      value={tipo.id_tipo_consulta.toString()}
                      className="capitalize"
                    >
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Seleccionado: {tipoConsultaFormulario ?
                  TipoConsulta.find(t => t.id_tipo_consulta === tipoConsultaFormulario)?.nombre
                  : 'Ninguno'}
              </p>
              {formErrors.tipoConsulta && (
                <p className="text-red-700 text-sm mt-1">{formErrors.tipoConsulta}</p>
              )}
            </div>
          )}

          <form.Field
            name="titulo"
            children={(field) => (
              <div>
                <Label htmlFor="titulo" className="mb-1 block">
                  Título:
                </Label>
                <Input
                  id="titulo"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="break-all w-full"
                  placeholder="Escribe un título corto"
                />
                {formErrors.titulo && (
                  <p className="text-red-700 text-sm mt-1 break-all">{formErrors.titulo}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="textoCompleto"
            children={(field) => (
              <div>
                <Label htmlFor="textoCompleto" className="mb-1 block">
                  Texto Completo:
                </Label>
                <RichTextEditor
                  value={field.state.value}
                  onChange={field.handleChange}
                  placeholder="Escribe el contenido de la bitácora..."
                />
                <div className="mt-1" />
              </div>
            )}
          />

          {formErrors.server && (
            <p className="text-red-700 text-sm text-center break-all">{formErrors.server}</p>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
            <Button type="submit" className="w-full sm:w-auto"
              variant={"create"}>
              Guardar
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Cancelar
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FormCrearBitacora;