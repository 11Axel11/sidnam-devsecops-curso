import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clasificarErrorEnvio } from "@/components/app/clinico/clasificarErrorEnvio";
import DialogoRegistro from "@/components/app/clinico/DialogoRegistro";
import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { idCampo } from "@/components/app/clinico/idCampo";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import CalendarField from "@/components/CalendarField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import { dataDe, statusDe } from "@/utils/apiError";
import { testMovimientoKeys, useCrearAplicacion } from "../hooks/testMovimientoHooks";
import {
  crearAplicacionSchema, filaVacia, MAX_TEXTO_EJERCICIO, type FilaTest,
} from "../schemas/testMovimientoSchema";
import {
  CAMPOS_APLICACION, CAMPOS_FILA, repartirErroresFormato, traducirFormatoAplicacion, type CampoFila,
  type ErroresFilas,
} from "../utils/erroresTestMovimiento";

type Props = {
  expedienteId: number;
  onClose: () => void;
};

type Valores = { fecha: string; filas: Record<number, FilaTest> };
type Errores = { fecha?: string; filas: ErroresFilas };

const ETIQUETAS: Record<CampoFila, string> = {
  modalidad: "Modalidad *",
  modificacion: "Modificación",
  resultado: "Resultado *",
};

const idFila = (ejercicioId: number, campo: CampoFila) => idCampo(`ejercicio-${ejercicioId}-${campo}`);

type CampoTextoProps = {
  ejercicioId: number;
  campo: CampoFila;
  valor: string;
  error?: string;
  onChange: (texto: string) => void;
};

// Texto libre de hasta 255 caracteres con contador: el instrumento no define valores permitidos.
function CampoTexto({ ejercicioId, campo, valor, error, onChange }: CampoTextoProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={idFila(ejercicioId, campo)}>{ETIQUETAS[campo]}</Label>
      <Input
        id={idFila(ejercicioId, campo)}
        autoComplete="off"
        maxLength={MAX_TEXTO_EJERCICIO}
        value={valor}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-right text-xs text-muted-foreground">{valor.length}/{MAX_TEXTO_EJERCICIO}</p>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}

// Una aplicación no se edita: este diálogo solo registra una nueva, con UNA fila por cada ejercicio ACTIVO del
// catálogo (el backend exige exactamente ese conjunto y guarda todo o nada). Lo escrito se guarda por
// `ejercicioId`, así sobrevive a que el catálogo cambie mientras el formulario está abierto.
// El padre lo monta solo mientras está abierto.
export default function AplicacionTestDialogo({ expedienteId, onClose }: Props) {
  const qc = useQueryClient();
  const crear = useCrearAplicacion();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const catalogo = useCatalogoQuery("ejercicio-test-movimiento");

  const ejercicios = useMemo(
    () => (catalogo.data ?? []).filter((i) => i.activo).sort((a, b) => a.id - b.id),
    [catalogo.data],
  );

  const [valores, setValores] = useState<Valores>(() => ({ fecha: hoyCostaRica(), filas: {} }));
  const [fechaInicial] = useState(valores.fecha);
  const [errores, setErrores] = useState<Errores>({ filas: {} });
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const hayTexto = Object.values(valores.filas).some((f) => f.modalidad || f.modificacion || f.resultado);
  const sinGuardar = valores.fecha !== fechaInicial || hayTexto;
  const guardando = crear.isPending;

  const limpiarAvisos = () => {
    setErroresServidor([]);
    setAviso(null);
  };

  const cambiarFecha = (fecha: string) => {
    setValores((v) => ({ ...v, fecha }));
    setErrores((e) => ({ ...e, fecha: undefined }));
    limpiarAvisos();
  };

  const cambiarFila = (id: number, campo: CampoFila, texto: string) => {
    setValores((v) => ({ ...v, filas: { ...v.filas, [id]: { ...(v.filas[id] ?? filaVacia()), [campo]: texto } } }));
    setErrores((e) => ({ ...e, filas: { ...e.filas, [id]: { ...e.filas[id], [campo]: undefined } } }));
    limpiarAvisos();
  };

  // Si el catálogo cambió mientras el formulario estaba abierto (se desactivó o se agregó un ejercicio), se
  // recarga: la fila sobrante desaparece o aparece la nueva, y lo escrito en las demás se conserva.
  const recargarCatalogo = async (enviados: readonly number[]) => {
    const r = await catalogo.refetch();
    const actuales = (r.data ?? []).filter((i) => i.activo).map((i) => i.id).sort((a, b) => a - b);
    if (actuales.join() !== enviados.join()) {
      setAviso("El catálogo de ejercicios cambió: revisa las filas y vuelve a guardar.");
    }
  };

  const manejarError = (err: unknown, enviados: readonly number[]) => {
    const data = dataDe<{ message?: string | string[] }>(err);
    // 400 de formato: los mensajes `ejercicios.N.campo …` van a la fila del ejercicio enviado en la posición N.
    if (statusDe(err) === 400 && Array.isArray(data?.message)) {
      const r = repartirErroresFormato(data.message, enviados);
      setErrores((prev) => ({ fecha: r.fecha ?? prev.fecha, filas: { ...prev.filas, ...r.filas } }));
      if (r.otros.length) setErroresServidor(r.otros);
      return;
    }
    const e = clasificarErrorEnvio(err, {
      campos: CAMPOS_APLICACION,
      traducir: traducirFormatoAplicacion,
      fallback: "No se pudo registrar la aplicación.",
      noExiste: "El expediente ya no existe.",
      conflicto: "No se pudo registrar la aplicación.",
    });
    switch (e.tipo) {
      case "errores":
        setErroresServidor(e.lista);
        void recargarCatalogo(enviados);
        break;
      case "campos":
        if (e.otros.length) setErroresServidor(e.otros);
        break;
      case "no-existe":
        setAviso(e.mensaje);
        qc.invalidateQueries({ queryKey: testMovimientoKeys.raiz });
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
    limpiarAvisos();
    const ids = ejercicios.map((e) => e.id);

    const parsed = crearAplicacionSchema(ids).safeParse(valores);
    if (!parsed.success) {
      const nuevos: Errores = { filas: {} };
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "fecha") {
          nuevos.fecha ??= issue.message;
        } else if (issue.path[0] === "filas") {
          const id = Number(issue.path[1]);
          const campo = issue.path[2] as CampoFila;
          nuevos.filas[id] = { ...nuevos.filas[id], [campo]: nuevos.filas[id]?.[campo] ?? issue.message };
        }
      }
      setErrores(nuevos);
      const primeraFila = ids.find((id) => CAMPOS_FILA.some((c) => nuevos.filas[id]?.[c]));
      const primerCampo = primeraFila === undefined ? undefined : CAMPOS_FILA.find((c) => nuevos.filas[primeraFila]?.[c]);
      const destino = nuevos.fecha
        ? idCampo("fecha")
        : primeraFila !== undefined && primerCampo ? idFila(primeraFila, primerCampo) : undefined;
      if (destino) document.getElementById(destino)?.focus();
      return false;
    }
    setErrores({ filas: {} });

    try {
      await crear.mutateAsync({
        expedienteId,
        body: {
          fecha: valores.fecha,
          ejercicios: ids.map((id) => {
            const f = valores.filas[id] ?? filaVacia();
            return {
              ejercicioId: id,
              modalidad: f.modalidad,
              ...(f.modificacion.trim() !== "" ? { modificacion: f.modificacion } : {}),
              resultado: f.resultado,
            };
          }),
        },
      });
      toast.success("Aplicación registrada", { duration: 6000 });
      return true;
    } catch (err) {
      manejarError(err, ids);
      return false;
    }
  };

  return (
    <DialogoRegistro
      expedienteId={expedienteId}
      titulo="Nueva aplicación del test de movimiento"
      descripcion="Registra un resultado por cada ejercicio. Una aplicación guardada no se puede editar: si hay un error, se anula con motivo y se registra una nueva."
      textoGuardar="Registrar aplicación"
      perdida="los datos de esta aplicación"
      anchoClase="sm:max-w-3xl"
      sinGuardar={sinGuardar}
      guardando={guardando}
      guardarDeshabilitado={catalogo.isLoading || catalogo.isError || ejercicios.length === 0}
      aviso={aviso}
      erroresServidor={erroresServidor}
      onGuardar={guardar}
      onClose={onClose}
    >
      <div id={idCampo("fecha")} tabIndex={-1} className="space-y-2 text-left outline-none">
        <Label>Fecha</Label>
        <CalendarField
          className="w-full max-w-[240px]"
          disableFuture
          value={valores.fecha}
          onChange={cambiarFecha}
        />
        {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
      </div>

      {catalogo.isLoading && <p className="text-sm text-muted-foreground">Cargando ejercicios…</p>}
      {catalogo.isError && (
        <p className="text-sm text-red-700" role="alert">No se pudo cargar el catálogo de ejercicios.</p>
      )}
      {catalogo.isSuccess && ejercicios.length === 0 && (
        <p role="alert" className="rounded-md border bg-muted/40 p-3 text-sm">
          No hay ejercicios activos en el catálogo, así que no se puede registrar una aplicación.
        </p>
      )}

      {ejercicios.map((e) => {
        const f = valores.filas[e.id] ?? filaVacia();
        const err = errores.filas[e.id];
        return (
          <div key={e.id} role="group" aria-labelledby={`ejercicio-${e.id}`} className="space-y-3 rounded-md border p-3">
            <h4 id={`ejercicio-${e.id}`} className="text-left text-sm font-semibold">{e.nombre}</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CAMPOS_FILA.map((campo) => (
                <CampoTexto
                  key={campo}
                  ejercicioId={e.id}
                  campo={campo}
                  valor={f[campo]}
                  error={err?.[campo]}
                  onChange={(texto) => cambiarFila(e.id, campo, texto)}
                />
              ))}
            </div>
          </div>
        );
      })}
      {ejercicios.length > 0 && <p className="text-xs text-muted-foreground">* Obligatorio. Texto libre de hasta 255 caracteres.</p>}
    </DialogoRegistro>
  );
}
