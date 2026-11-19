import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import { clasificarErrorEnvio } from "@/components/app/clinico/clasificarErrorEnvio";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import DialogoRegistro from "@/components/app/clinico/DialogoRegistro";
import { ahoraCostaRicaLocal } from "@/components/app/clinico/fechaClinica";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { idCampo } from "@/components/app/clinico/idCampo";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import { esTipoOtro } from "@/components/app/clinico/tipoOtro";
import CalendarField from "@/components/CalendarField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import { eventoKeys, useCrearEvento } from "../hooks/eventosHooks";
import { crearEventoSchema } from "../schemas/eventoSchema";
import { CAMPOS_EVENTO, traducirFormatoEvento } from "../utils/erroresEventos";
import { componerFechaHora } from "../utils/horaCostaRica";

type Props = {
  expedienteId: number;
  onClose: () => void;
};

type ValoresEvento = { fecha: string; hora: string; tipoEventoId: number; descripcion: string };
type Campo = "fecha" | "hora" | "tipoEventoId" | "descripcion";
type Errores = Partial<Record<Campo, string>>;

const CAMPOS_FORM: readonly Campo[] = ["fecha", "hora", "tipoEventoId", "descripcion"];

// Fecha y hora iniciales = ahora en hora de Costa Rica (no la del navegador); tipo sin elegir.
const valoresIniciales = (): ValoresEvento => {
  const { fecha, hora } = ahoraCostaRicaLocal();
  return { fecha, hora, tipoEventoId: 0, descripcion: "" };
};

// Un evento no se edita: este diálogo solo registra uno nuevo. La fecha y hora se envían SIN zona
// (el backend las toma como hora de Costa Rica). El padre lo monta solo mientras está abierto.
export default function EventoDialogo({ expedienteId, onClose }: Props) {
  const qc = useQueryClient();
  const crear = useCrearEvento();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const catalogo = useCatalogoQuery("tipo-evento-importante");

  const [valores, setValores] = useState<ValoresEvento>(valoresIniciales);
  // Estado con el que abrió el formulario: sirve para saber si hay cambios sin guardar.
  const [inicial] = useState<ValoresEvento>(valores);
  const [errores, setErrores] = useState<Errores>({});
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(inicial);
  const guardando = crear.isPending;

  const opciones = useMemo(() => (catalogo.data ?? []).filter((i) => i.activo), [catalogo.data]);
  // Un tipo que ya no está entre los activos (se desactivó con el formulario abierto) cuenta como «sin elegir».
  const tipoEventoId = opciones.some((o) => o.id === valores.tipoEventoId) ? valores.tipoEventoId : 0;
  const esOtro = esTipoOtro(opciones.find((o) => o.id === tipoEventoId)?.nombre);

  const cambiar = (parche: Partial<ValoresEvento>, campo: Campo) => {
    setValores((v) => ({ ...v, ...parche }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErroresServidor([]);
    setAviso(null);
  };

  const manejarError = (err: unknown) => {
    const e = clasificarErrorEnvio(err, {
      campos: CAMPOS_EVENTO,
      traducir: traducirFormatoEvento,
      fallback: "No se pudo registrar el evento.",
      noExiste: "El expediente ya no existe.",
      conflicto: "No se pudo registrar el evento.",
    });
    switch (e.tipo) {
      case "errores":
        setErroresServidor(e.lista);
        // Si el tipo se desactivó o dejó de existir mientras el formulario estaba abierto, se recarga el
        // catálogo para que desaparezca de la lista; lo escrito se conserva.
        void catalogo.refetch();
        break;
      case "campos": {
        const { fechaHora, ...resto } = e.campos;
        setErrores((prev) => ({ ...prev, ...(resto as Errores), ...(fechaHora ? { fecha: fechaHora } : {}) }));
        if (e.otros.length) setErroresServidor(e.otros);
        break;
      }
      case "no-existe":
        setAviso(e.mensaje);
        qc.invalidateQueries({ queryKey: eventoKeys.raiz });
        break;
      // 409 `EXPEDIENTE_INACTIVO`: lo cerraron con el formulario abierto. Se avisa, se refresca el estado y
      // lo escrito se conserva.
      case "expediente-inactivo":
        setAviso(e.mensaje);
        refrescarExpediente();
        toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
        break;
      case "conflicto":
      case "otro":
        setAviso(e.mensaje);
        break;
      // Sin respuesta del servidor = problema de conexión: el diálogo sigue abierto con lo escrito.
      case "red":
        setAviso(MENSAJE_RED);
        toastRedCaida();
        break;
    }
  };

  // Devuelve `true` si se guardó: el armazón cierra el diálogo y apaga el aviso de salida.
  const guardar = async (): Promise<boolean> => {
    setErroresServidor([]);
    setAviso(null);

    const parsed = crearEventoSchema(esOtro).safeParse({ ...valores, tipoEventoId });
    if (!parsed.success) {
      const campos: Errores = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as Campo;
        if (!campos[campo]) campos[campo] = issue.message;
      }
      setErrores(campos);
      const primero = CAMPOS_FORM.find((c) => campos[c]);
      if (primero) document.getElementById(idCampo(primero))?.focus();
      return false;
    }
    setErrores({});

    try {
      await crear.mutateAsync({
        expedienteId,
        body: {
          fechaHora: componerFechaHora(valores.fecha, valores.hora),
          tipoEventoId,
          ...(valores.descripcion.trim() !== "" ? { descripcion: valores.descripcion } : {}),
        },
      });
      toast.success("Evento registrado", { duration: 6000 });
      return true;
    } catch (err) {
      manejarError(err);
      return false;
    }
  };

  return (
    <DialogoRegistro
      expedienteId={expedienteId}
      titulo="Nuevo evento importante"
      descripcion="Un evento guardado no se puede editar: si hay un error, se anula con motivo y se registra uno nuevo. La fecha y la hora son las de Costa Rica."
      textoGuardar="Registrar evento"
      perdida="los datos de este evento"
      anchoClase="sm:max-w-xl"
      sinGuardar={sinGuardar}
      guardando={guardando}
      aviso={aviso}
      erroresServidor={erroresServidor}
      onGuardar={guardar}
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div id={idCampo("fecha")} tabIndex={-1} className="space-y-2 outline-none">
          <Label>Fecha</Label>
          <CalendarField
            className="w-full"
            disableFuture
            value={valores.fecha}
            onChange={(iso) => cambiar({ fecha: iso }, "fecha")}
          />
          {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
        </div>
        <CampoValoracion nombre="hora" etiqueta="Hora (Costa Rica)" error={errores.hora}>
          <Input
            id={idCampo("hora")}
            type="time"
            value={valores.hora}
            aria-invalid={!!errores.hora}
            onChange={(e) => cambiar({ hora: e.target.value }, "hora")}
          />
        </CampoValoracion>
      </div>

      <CampoValoracion nombre="tipoEventoId" etiqueta="Tipo de evento (obligatorio)" error={errores.tipoEventoId}>
        <Select
          value={tipoEventoId ? String(tipoEventoId) : ""}
          onValueChange={(v) => cambiar({ tipoEventoId: Number(v) }, "tipoEventoId")}
          disabled={catalogo.isLoading}
        >
          <SelectTrigger id={idCampo("tipoEventoId")} className="w-full" aria-invalid={!!errores.tipoEventoId}>
            <SelectValue placeholder={catalogo.isLoading ? "Cargando…" : "Selecciona un tipo"} />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        {catalogo.isError && (
          <p className="text-sm text-red-700" role="alert">No se pudo cargar el catálogo de tipos de evento.</p>
        )}
      </CampoValoracion>

      <CampoValoracion
        nombre="descripcion"
        etiqueta={esOtro ? "Descripción (obligatoria para «Otro»)" : "Descripción"}
        error={errores.descripcion}
      >
        <TextareaAutoexpandible
          id={idCampo("descripcion")}
          maxLength={20000}
          mostrarContador
          placeholder="Qué ocurrió, cómo se atendió, a quién se avisó…"
          aria-invalid={!!errores.descripcion}
          value={valores.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value }, "descripcion")}
        />
      </CampoValoracion>
    </DialogoRegistro>
  );
}
