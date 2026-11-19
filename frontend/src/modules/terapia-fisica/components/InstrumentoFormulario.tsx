import { useMemo, useState } from "react";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import AvisoSalirDialogo from "@/components/app/clinico/AvisoSalirDialogo";
import BarraAyudaEvaluacion from "@/components/app/clinico/BarraAyudaEvaluacion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import EncabezadoVolver from "@/components/app/clinico/EncabezadoVolver";
import { clasificarErrorEnvio } from "@/components/app/clinico/clasificarErrorEnvio";
import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { idCampo } from "@/components/app/clinico/idCampo";
import ItemRadios from "@/components/app/clinico/ItemRadios";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { useAvisoSalirSinGuardar } from "@/components/app/clinico/useAvisoSalirSinGuardar";
import CalendarField from "@/components/CalendarField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { useCrearEvaluacion } from "../hooks/evaluacionesHooks";
import type { DefinicionInstrumento } from "@/components/app/clinico/instrumento";
import type { EvaluacionDe, InstrumentoTF } from "../models/evaluaciones";
import {
  construirPayloadEvaluacion, crearEsquemaEvaluacion, itemsDe, valoresInicialesEvaluacion, type ValoresEvaluacion,
} from "../schemas/evaluacionSchema";
import { traducirFormatoEvaluacion } from "../utils/erroresEvaluacion";

type Props<I extends InstrumentoTF> = {
  instrumento: I;
  expedienteId: number;
  definicion: DefinicionInstrumento;
  titulo: string;
  /** Aviso sobre lo que asigna el sistema al guardar (p. ej. N.º de control y edad en Tinetti). */
  avisoSistema?: string;
  onGuardada: (evaluacion: EvaluacionDe<I>) => void;
  onSalir: () => void;
};

// Pantalla «Nueva evaluación» de un instrumento: se dibuja SOLO desde la definición (un grupo de radios
// por ítem). Todos los ítems son obligatorios (no hay borrador). No se calcula ni se muestra ningún
// puntaje mientras se llena: la ayuda es el avance «X de N». El resultado lo devuelve el backend.
export default function InstrumentoFormulario<I extends InstrumentoTF>({
  instrumento, expedienteId, definicion, titulo, avisoSistema, onGuardada, onSalir,
}: Props<I>) {
  const { idUsuario, name } = useAuth();
  const confirmar = useConfirmacion();
  const crear = useCrearEvaluacion(instrumento);
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);

  const esquema = useMemo(() => crearEsquemaEvaluacion(definicion), [definicion]);
  const camposItems = useMemo(() => itemsDe(definicion).map((i) => i.campo), [definicion]);

  const [valores, setValores] = useState<ValoresEvaluacion>(() => valoresInicialesEvaluacion(definicion, hoyCostaRica()));
  // Estado con el que abrió el formulario: sirve para saber si hay cambios sin guardar.
  const [inicial] = useState<ValoresEvaluacion>(valores);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(inicial);
  const { bloqueo, marcarGuardado } = useAvisoSalirSinGuardar(sinGuardar);
  const guardando = crear.isPending;

  const respondidos = (campos: readonly string[]) => campos.filter((c) => valores.items[c] !== null).length;
  const partes = definicion.secciones.length > 1
    ? definicion.secciones.map((s) => ({
        titulo: s.titulo.replace(/^Parte [IV]+ — /, "").replace(/ \(máx\. \d+\)$/, ""),
        respondidos: respondidos(s.items.map((i) => i.campo)),
        total: s.items.length,
      }))
    : undefined;

  const limpiar = (campo: string) => {
    setErrores((e) => { const sig = { ...e }; delete sig[campo]; return sig; });
    setErroresServidor([]);
    setAviso(null);
  };
  const elegir = (campo: string, puntos: number) => {
    setValores((v) => ({ ...v, items: { ...v.items, [campo]: puntos } }));
    limpiar(campo);
  };

  const volver = async () => {
    if (guardando) return;
    if (!sinGuardar || await confirmar("Hay cambios sin guardar: si sales ahora se perderán. ¿Salir sin guardar?", "destructive")) onSalir();
  };

  const enfocar = (campo: string) => {
    const el = document.getElementById(idCampo(campo));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  const manejarError = (err: unknown) => {
    const e = clasificarErrorEnvio(err, {
      campos: [...camposItems, "fecha", "observaciones"],
      traducir: traducirFormatoEvaluacion,
      fallback: "No se pudo registrar la evaluación.",
      noExiste: "El expediente ya no existe.",
      conflicto: "No se pudo registrar la evaluación.",
    });
    switch (e.tipo) {
      case "errores":
        setErroresServidor(e.lista);
        break;
      case "campos": {
        setErrores((prev) => ({ ...prev, ...e.campos }));
        if (e.otros.length) setErroresServidor(e.otros);
        const primero = camposItems.find((c) => e.campos[c]) ?? Object.keys(e.campos)[0];
        if (primero) enfocar(primero);
        break;
      }
      // 409 `EXPEDIENTE_INACTIVO`: lo cerraron con el formulario abierto. Se avisa, se refresca el estado y
      // lo escrito se conserva.
      case "expediente-inactivo":
        setAviso(e.mensaje);
        refrescarExpediente();
        toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
        break;
      // 404: el expediente no existe. 409: expediente sin la fecha de nacimiento del residente (Tinetti).
      case "no-existe":
      case "conflicto":
      case "otro":
        setAviso(e.mensaje);
        break;
      // Sin respuesta del servidor = problema de conexión: lo escrito sigue en el formulario.
      case "red":
        setAviso(MENSAJE_RED);
        toastRedCaida();
        break;
    }
  };

  const guardar = async () => {
    setErroresServidor([]);
    setAviso(null);

    const parsed = esquema.safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const campo = String(issue.path[issue.path.length - 1]);
        if (!campos[campo]) campos[campo] = issue.message;
      }
      setErrores(campos);
      const primero = campos.fecha ? "fecha" : camposItems.find((c) => campos[c]) ?? Object.keys(campos)[0];
      if (primero) enfocar(primero);
      return;
    }
    setErrores({});

    try {
      const evaluacion = await crear.mutateAsync({ expedienteId, body: construirPayloadEvaluacion(valores) });
      toast.success("Evaluación registrada");
      marcarGuardado();
      onGuardada(evaluacion as EvaluacionDe<I>);
    } catch (err) {
      manejarError(err);
    }
  };

  return (
    <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <EncabezadoVolver titulo={titulo} onVolver={() => void volver()} />

      {(erroresServidor.length > 0 || aviso) && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {aviso && <p>{aviso}</p>}
          {erroresServidor.length > 0 && (
            <ul className="list-disc pl-5">
              {erroresServidor.map((m) => <li key={m}>{m}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 xl:grid-cols-3">
        <div id={idCampo("fecha")} tabIndex={-1} className="space-y-2 outline-none">
          <Label>Fecha de la evaluación</Label>
          <CalendarField
            className="w-full max-w-[240px]"
            disableFuture
            value={valores.fecha}
            onChange={(iso) => { setValores((v) => ({ ...v, fecha: iso })); limpiar("fecha"); }}
          />
          {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
        </div>
        <div className="space-y-2">
          <Label>Persona examinadora</Label>
          <p className="text-sm"><ResponsableValoracion id={idUsuario} nombre={name} /></p>
        </div>
        {avisoSistema && <p className="self-end text-xs text-muted-foreground">{avisoSistema}</p>}
      </div>

      <p className="text-sm text-muted-foreground">
        Todos los ítems son obligatorios: no hay borrador. Los puntajes y el resultado los calcula el sistema al guardar.
      </p>

      <div className={definicion.secciones.length > 1 ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : ""}>
        {definicion.secciones.map((s) => (
          <section key={s.clave} className="space-y-3">
            {definicion.secciones.length > 1 && (
              <div>
                <h4 className="font-semibold text-[#A7074D]">{s.titulo}</h4>
                {s.instruccion && <p className="text-xs text-muted-foreground">{s.instruccion}</p>}
              </div>
            )}
            <div className={definicion.secciones.length > 1 ? "space-y-3" : "grid grid-cols-1 gap-3 lg:grid-cols-2"}>
              {s.items.map((item, i) => (
                <ItemRadios
                  key={item.campo}
                  indice={i + 1}
                  item={item}
                  valor={valores.items[item.campo]}
                  error={errores[item.campo]}
                  onChange={(puntos) => elegir(item.campo, puntos)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <CampoValoracion nombre="observaciones" etiqueta="Observaciones (opcional)" error={errores.observaciones}>
        <TextareaAutoexpandible
          id={idCampo("observaciones")}
          value={valores.observaciones}
          maxLength={20000}
          mostrarContador
          aria-invalid={!!errores.observaciones}
          onChange={(e) => { setValores((v) => ({ ...v, observaciones: e.target.value })); limpiar("observaciones"); }}
        />
      </CampoValoracion>

      <BarraAyudaEvaluacion
        respondidos={respondidos(camposItems)}
        total={camposItems.length}
        partes={partes}
        acciones={
          <>
            <Button type="button" variant="outline" className="h-11" disabled={guardando} onClick={() => void volver()}>Cancelar</Button>
            <BotonRegistro expedienteId={expedienteId} type="submit" variant="create" className="h-11 min-w-[200px]" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar evaluación"}
            </BotonRegistro>
          </>
        }
      />

      <AvisoSalirDialogo bloqueo={bloqueo} descripcion="Si sales ahora, las respuestas de esta evaluación que no has guardado se perderán." />
    </form>
  );
}
