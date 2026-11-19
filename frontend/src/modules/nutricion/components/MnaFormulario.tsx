import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AvisoSalirDialogo from "@/components/app/clinico/AvisoSalirDialogo";
import BarraAyudaEvaluacion from "@/components/app/clinico/BarraAyudaEvaluacion";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import { clasificarErrorEnvio } from "@/components/app/clinico/clasificarErrorEnvio";
import EncabezadoVolver from "@/components/app/clinico/EncabezadoVolver";
import { hoyCostaRica } from "@/components/app/clinico/fechaClinica";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { idCampo } from "@/components/app/clinico/idCampo";
import ItemRadios from "@/components/app/clinico/ItemRadios";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { useAvisoSalirSinGuardar } from "@/components/app/clinico/useAvisoSalirSinGuardar";
import CalendarField from "@/components/CalendarField";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmacion } from "@/hooks/useConfirmar";
// useDebounce vive en voluntariado y ya lo usa Proveeduría: se importa desde su ubicación actual, sin
// moverlo ni duplicarlo.
import useDebounce from "@/modules/voluntariado/hooks/gestionVoluntariado/useDebounce";
import { controlNutricionalKeys, useControlesNutricionales } from "../hooks/controlNutricionalHooks";
import { mnaKeys, useCrearEvaluacionMna, useEvaluacionesMna, useLimpiarVistaPreviaMna, useVistaPreviaMna } from "../hooks/mnaHooks";
import { MNA_V1 } from "../instrumentos/mnaV1";
import type { ControlNutricionalFila } from "../models/controlNutricional";
import type { EvaluacionMna, ItemsOrigen, PayloadMna } from "../models/mna";
import {
  construirPayloadMna, crearEsquemaMna, cuerpoVistaPrevia, derivadosDe, ITEMS_CRIBAJE, ITEMS_EVALUACION, ITEMS_MNA, letraDeCampo,
  valoresInicialesMna, type ValoresMna,
} from "../schemas/mnaSchema";
import { CAMPOS_MNA, mensajesVistaPrevia, separarErroresControl, traducirFormatoMna } from "../utils/erroresMna";
import { controlesElegibles, controlesVinculados, controlPropuesto } from "../utils/mnaForm";
import ItemDerivadoMna from "./ItemDerivadoMna";
import SelectorControlMna from "./SelectorControlMna";
import VistaPreviaMna from "./VistaPreviaMna";

const PAUSA_VISTA_PREVIA_MS = 500;

type Props = {
  expedienteId: number;
  onGuardada: (evaluacion: EvaluacionMna) => void;
  onSalir: () => void;
};

// Espera a los controles y a la serie (sin ellos no se puede proponer el vínculo) y monta el formulario.
export default function MnaFormulario(props: Props) {
  const controles = useControlesNutricionales(props.expedienteId, { incluirAnulados: false });
  const serie = useEvaluacionesMna(props.expedienteId, { incluirAnulados: false });
  if (controles.isLoading || serie.isLoading) return <WebLoader />;
  return <MnaFormularioContenido {...props} controles={controles.data ?? []} evaluaciones={serie.data ?? []} />;
}

type ContenidoProps = Props & {
  controles: readonly ControlNutricionalFila[];
  evaluaciones: readonly EvaluacionMna[];
};

// Pantalla «Nueva evaluación MNA»: se dibuja SOLO desde `MNA_V1`. El frontend no calcula nada: mientras se
// llena, la vista previa del backend (POST …/calcular, con pausa) informa subtotales, global,
// interpretaciones y el estado de la segunda parte; el resultado oficial es el del registro.
function MnaFormularioContenido({ expedienteId, controles, evaluaciones, onGuardada, onSalir }: ContenidoProps) {
  const qc = useQueryClient();
  const { idUsuario, name } = useAuth();
  const confirmar = useConfirmacion();
  const crear = useCrearEvaluacionMna();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const limpiarVistaPrevia = useLimpiarVistaPreviaMna();
  // Al salir del formulario (guardar, volver o cambiar de ruta) no queda vista previa en caché.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => limpiarVistaPrevia, []);

  const [valores, setValores] = useState<ValoresMna>(() => valoresInicialesMna(hoyCostaRica()));
  // Estado con el que abrió el formulario: sirve para saber si hay cambios sin guardar.
  const [inicial] = useState<ValoresMna>(valores);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [erroresControl, setErroresControl] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoControl, setAvisoControl] = useState<string | null>(null);

  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(inicial);
  const { bloqueo, marcarGuardado } = useAvisoSalirSinGuardar(sinGuardar);
  const guardando = crear.isPending;

  // ---- vínculo con un control ----
  const elegibles = useMemo(() => controlesElegibles(controles, valores.fecha), [controles, valores.fecha]);
  const vinculados = useMemo(() => controlesVinculados(evaluaciones), [evaluaciones]);
  const propuesto = useMemo(() => controlPropuesto(elegibles, vinculados), [elegibles, vinculados]);
  // Sin elección del usuario rige el propuesto; «Sin vincular» (null) no vuelve a vincular solo.
  const controlId: number | null = valores.controlElegido === undefined
    ? propuesto?.id ?? null
    : valores.controlElegido !== null && elegibles.some((c) => c.id === valores.controlElegido)
      ? valores.controlElegido
      : null;
  const control = controlId === null ? null : elegibles.find((c) => c.id === controlId) ?? null;

  // ---- vista previa del backend (con pausa; la petición anterior se aborta al cambiar el cuerpo) ----
  // El origen de F, Q y R lo informa la propia vista previa (`itemsOrigen`): se recuerda el último conocido
  // PARA ESTE control (si cambia el control se descarta) y con él se arma el siguiente cuerpo.
  const [origenConocido, setOrigenConocido] = useState<{ controlId: number | null; origen?: ItemsOrigen }>({ controlId: null });
  const origen = controlId !== null && origenConocido.controlId === controlId ? origenConocido.origen : undefined;
  const cuerpo = useMemo(() => cuerpoVistaPrevia(valores, controlId, origen), [valores, controlId, origen]);
  const cuerpoTexto = cuerpo ? JSON.stringify(cuerpo) : "";
  const cuerpoConPausa = useDebounce(cuerpoTexto, PAUSA_VISTA_PREVIA_MS);
  const previa = useVistaPreviaMna(expedienteId, cuerpoConPausa ? (JSON.parse(cuerpoConPausa) as PayloadMna) : null);
  const disponible = cuerpo !== null;
  const calculando = disponible && (cuerpoTexto !== cuerpoConPausa || previa.isFetching);
  const erroresPrevia = disponible && previa.isError && cuerpoTexto === cuerpoConPausa ? mensajesVistaPrevia(previa.error) : [];
  // Con un error de la vista previa no se muestran los números de la respuesta anterior (placeholder).
  const datos = disponible && erroresPrevia.length === 0 ? previa.data : undefined;
  const requerida = datos?.segundaParte.requerida;

  useEffect(() => {
    const d = previa.data;
    if (!d || controlId === null || d.controlId !== controlId) return;
    setOrigenConocido((prev) =>
      prev.controlId === controlId && JSON.stringify(prev.origen ?? null) === JSON.stringify(d.itemsOrigen ?? null)
        ? prev
        : { controlId, origen: d.itemsOrigen });
  }, [previa.data, controlId]);
  // F, Q y R que el control vinculado derivó: solo lectura, no se envían y no cuentan como «por responder».
  const derivados = useMemo(() => (controlId === null ? new Set<string>() : derivadosDe(origen)), [controlId, origen]);

  // ---- avance ----
  const conF = controlId === null;
  const camposCribaje = ITEMS_CRIBAJE.map((i) => i.campo).filter((c) => (conF || c !== "itemF") && !derivados.has(c));
  const camposEvaluacion = ITEMS_EVALUACION.map((i) => i.campo).filter((c) => !derivados.has(c));
  const respondidos = (campos: readonly string[]) => campos.filter((c) => valores.items[c] !== null).length;

  const limpiar = (campo?: string) => {
    if (campo) setErrores((e) => { const sig = { ...e }; delete sig[campo]; return sig; });
    setErroresServidor([]);
    setErroresControl([]);
    setAviso(null);
  };
  const elegir = (campo: string, puntos: number) => {
    setValores((v) => ({ ...v, items: { ...v.items, [campo]: puntos } }));
    setAvisoControl(null);
    limpiar(campo);
  };
  const cambiarControl = (id: number | null) => {
    setValores((v) => ({ ...v, controlElegido: id }));
    setAvisoControl(null);
    limpiar("controlNutricionalId");
  };
  // Si el control elegido queda posterior a la nueva fecha, se vuelve al propuesto y se avisa. «Sin
  // vincular» se respeta.
  const cambiarFecha = (fecha: string) => {
    const elegido = valores.controlElegido;
    const sigueElegible = typeof elegido !== "number" || controlesElegibles(controles, fecha).some((c) => c.id === elegido);
    setValores((v) => ({ ...v, fecha, controlElegido: sigueElegible ? v.controlElegido : undefined }));
    setAvisoControl(sigueElegible ? null : "El control elegido es posterior a la nueva fecha de la evaluación: se volvió al control propuesto.");
    limpiar("fecha");
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

  // Tras un error del vínculo se refrescan controles y serie y se FIJA el control que se intentó vincular:
  // sin eso, al volver a calcular el propuesto, el selector cambiaría solo y el mensaje quedaría huérfano.
  const refrescarVinculo = () => {
    setValores((v) => ({ ...v, controlElegido: controlId }));
    qc.invalidateQueries({ queryKey: controlNutricionalKeys.raiz });
    qc.invalidateQueries({ queryKey: mnaKeys.raiz });
  };

  const manejarError = (err: unknown) => {
    const e = clasificarErrorEnvio(err, {
      campos: CAMPOS_MNA,
      traducir: traducirFormatoMna,
      fallback: "No se pudo registrar la evaluación.",
      noExiste: "El expediente ya no existe.",
      conflicto: "No se pudo registrar la evaluación.",
    });
    switch (e.tipo) {
      case "errores": {
        const { control: delControl, otros } = separarErroresControl(e.lista);
        setErroresControl(delControl);
        setErroresServidor(otros);
        // «itemQ/itemR/itemF no coincide con…»: además del banner, se marca el ítem.
        const porItem: Record<string, string> = {};
        for (const m of otros) {
          const campo = /^(itemF|itemQ|itemR) /.exec(m)?.[1];
          if (campo) porItem[campo] = m;
        }
        if (Object.keys(porItem).length) setErrores((prev) => ({ ...prev, ...porItem }));
        if (delControl.length) { refrescarVinculo(); enfocar("controlNutricionalId"); }
        break;
      }
      case "campos": {
        const { controlNutricionalId, ...porCampo } = e.campos;
        setErrores((prev) => ({ ...prev, ...porCampo }));
        if (controlNutricionalId) setErroresControl([controlNutricionalId]);
        if (e.otros.length) setErroresServidor(e.otros);
        const primero = ITEMS_MNA.map((i) => i.campo).find((c) => porCampo[c]) ?? Object.keys(porCampo)[0];
        if (primero) enfocar(primero);
        break;
      }
      // 409: el control ya está vinculado a otra evaluación activa (se refrescan controles y serie).
      // 409 `EXPEDIENTE_INACTIVO`: lo cerraron con el formulario abierto. Se avisa, se refresca el estado y
      // lo escrito se conserva.
      case "expediente-inactivo":
        setAviso(e.mensaje);
        refrescarExpediente();
        toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
        break;
      case "conflicto":
        setErroresControl([e.mensaje]);
        refrescarVinculo();
        enfocar("controlNutricionalId");
        break;
      case "no-existe":
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
    limpiar();
    const parsed = crearEsquemaMna(controlId !== null).safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const campo = String(issue.path[issue.path.length - 1]);
        if (!campos[campo]) campos[campo] = issue.message;
      }
      setErrores(campos);
      const primero = campos.fecha ? "fecha" : ITEMS_MNA.map((i) => i.campo).find((c) => campos[c]);
      if (primero) enfocar(primero);
      return;
    }
    setErrores({});

    try {
      const evaluacion = await crear.mutateAsync({ expedienteId, body: construirPayloadMna(valores, controlId, derivados) });
      limpiarVistaPrevia();
      toast.success("Evaluación registrada");
      marcarGuardado();
      onGuardada(evaluacion);
    } catch (err) {
      manejarError(err);
    }
  };

  const indicacionSegundaParte = requerida === undefined ? "según el cribaje" : requerida ? "obligatoria" : "opcional";

  return (
    <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <EncabezadoVolver titulo="Nueva evaluación MNA" onVolver={() => void volver()} />

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
          <CalendarField className="w-full max-w-[240px]" disableFuture value={valores.fecha} onChange={cambiarFecha} />
          {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
        </div>
        <div className="space-y-2">
          <Label>Persona responsable</Label>
          <p className="text-sm"><ResponsableValoracion id={idUsuario} nombre={name} /></p>
        </div>
        <SelectorControlMna
          controles={elegibles}
          vinculados={vinculados}
          valor={controlId}
          onChange={cambiarControl}
          errores={erroresControl.length > 0 ? erroresControl : errores.controlNutricionalId ? [errores.controlNutricionalId] : []}
          aviso={avisoControl}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Los ítems A–F (cribaje) son obligatorios. Los subtotales, el global y las interpretaciones los calcula el sistema.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {MNA_V1.secciones.map((s) => {
            const esEvaluacion = s.clave === "evaluacion";
            return (
              <section key={s.clave} className="space-y-3">
                <div>
                  <h4 className="font-semibold text-[#A7074D]">
                    {s.titulo}{esEvaluacion && <span className="font-normal text-muted-foreground"> — {indicacionSegundaParte}</span>}
                  </h4>
                  {esEvaluacion && control && !origen && (
                    <p className="text-xs text-muted-foreground">
                      Los ítems Q y R se tomarán del control vinculado si trae la medida; se mostrarán al responder A–E.
                    </p>
                  )}
                </div>
                <div className={esEvaluacion ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "space-y-3"}>
                  {s.items.map((item, i) =>
                    control && (item.campo === "itemF" || derivados.has(item.campo)) ? (
                      <ItemDerivadoMna
                        key={item.campo}
                        campo={item.campo as "itemF" | "itemQ" | "itemR"}
                        nombre={item.nombre}
                        origen={origen?.[item.campo as "itemF" | "itemQ" | "itemR"]}
                        error={errores[item.campo]}
                      />
                    ) : (
                      <div key={item.campo} className="space-y-1">
                        <ItemRadios
                          indice={i + 1}
                          rotulo={`${letraDeCampo(item.campo)}.`}
                          item={item}
                          valor={valores.items[item.campo]}
                          error={errores[item.campo]}
                          onChange={(puntos) => elegir(item.campo, puntos)}
                        />
                        {/* Ítem que el control no pudo derivar: se registra a mano; se muestra el motivo del backend. */}
                        {control && origen?.[item.campo as "itemQ" | "itemR"]?.motivo && (
                          <p className="px-3 text-xs text-muted-foreground">{origen[item.campo as "itemQ" | "itemR"]?.motivo}</p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <aside className="order-first lg:order-none lg:sticky lg:top-4 lg:self-start">
          <VistaPreviaMna datos={datos} disponible={disponible} calculando={calculando} errores={erroresPrevia} />
        </aside>
      </div>

      <BarraAyudaEvaluacion
        respondidos={respondidos(camposCribaje) + respondidos(camposEvaluacion)}
        total={camposCribaje.length + camposEvaluacion.length}
        partes={[
          { titulo: "Cribaje", respondidos: respondidos(camposCribaje), total: camposCribaje.length },
          { titulo: "Evaluación", respondidos: respondidos(camposEvaluacion), total: camposEvaluacion.length },
        ]}
        vistaPrevia={<VistaPreviaMna compacta datos={datos} disponible={disponible} calculando={calculando} errores={erroresPrevia} />}
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
