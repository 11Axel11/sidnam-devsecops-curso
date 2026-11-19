import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/animate-ui/radix/accordion";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import IfPerm from "@/components/auth/IfPerm";
import CalendarField from "@/components/CalendarField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { PERM } from "@/lib/permisosClinicos";
import { cn } from "@/lib/utils";
import { dataDe, esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import AvisoSalirDialogo from "@/components/app/clinico/AvisoSalirDialogo";
import { esExpedienteInactivo, MENSAJE_EXPEDIENTE_INACTIVO } from "@/components/app/clinico/expedienteInactivo";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { traducirFormatoComun } from "@/components/app/clinico/erroresFormato";
import { useAvisoSalirSinGuardar } from "@/components/app/clinico/useAvisoSalirSinGuardar";
import Interruptor from "@/components/app/clinico/Interruptor";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import {
  useActualizarValoracion, useConfirmarValoracion, useCrearValoracion,
  useGuardarAntecedentesPersonales, valoracionKeys,
} from "../hooks/valoracionHooks";
import {
  CARACTERISTICAS_DOLOR, type AntecedentePersonalInput, type AntecedentePersonalValoracion,
  type ErrorConfirmar, type Valoracion, type ValoracionDetalle,
} from "../models/valoracion";
import { antecedentesPersonalesSchema, valoracionBorradorSchema } from "../schemas/valoracionSchema";
import {
  aplicarCambio, construirPayloadActualizar, construirPayloadCrear, valoresDesde, valoresIniciales,
  type ValoresValoracion,
} from "../utils/valoracionForm";
import AntecedentesPersonalesChecklist, { type EstadoAntecedente } from "./AntecedentesPersonalesChecklist";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import { idCampo } from "@/components/app/clinico/idCampo";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";

type SeccionId = "antecedentes" | "caidas" | "dolor" | "cognitivo" | "pruebas" | "avances";

const SECCIONES: { id: SeccionId; titulo: string }[] = [
  { id: "antecedentes", titulo: "Antecedentes personales" },
  { id: "caidas", titulo: "Antecedentes de caídas y ayudas biomecánicas" },
  { id: "dolor", titulo: "Valoración del dolor" },
  { id: "cognitivo", titulo: "Estado cognitivo y conductual" },
  { id: "pruebas", titulo: "Pruebas generales, diagnóstico diferencial y tratamiento" },
  { id: "avances", titulo: "Avances" },
];

// Campo del DTO -> acordeón que lo contiene (para abrirlo al marcar un error).
const SECCION_DE: Record<string, SeccionId> = {
  otrosDiagnosticos: "antecedentes", antecedentePersonal: "antecedentes",
  antecedentesCaidas: "caidas", detalleCaidas: "caidas", usoAyudasBiomecanicas: "caidas", detalleAyudasBiomecanicas: "caidas",
  presentaDolor: "dolor", zonaDolorosa: "dolor", caracteristicasDolor: "dolor", direccionIrradiacion: "dolor", intensidadDolor: "dolor",
  orientacionPersona: "cognitivo", orientacionEspacio: "cognitivo", orientacionTiempo: "cognitivo",
  conscienteOrientado: "cognitivo", cambiosConductuales: "cognitivo", estadosAnimo: "cognitivo",
  rangoMovimiento: "pruebas", fuerzaMuscularDinamometria: "pruebas", postura: "pruebas", riesgoUlcera: "pruebas",
  diagnosticoDiferencial: "pruebas", tratamiento: "pruebas", avances: "avances",
};

// Orden en pantalla para llevar el foco al primer campo faltante.
const ORDEN_PANTALLA = [
  "fecha", "antecedentePersonal", "detalleCaidas", "detalleAyudasBiomecanicas",
  "zonaDolorosa", "intensidadDolor", "direccionIrradiacion",
];

const TEXTO_FALTANTE = "Obligatorio para cerrar la valoración";

function traducirFormato(campo: string, msg: string): string {
  const comun = traducirFormatoComun(msg);
  if (comun) return comun;
  if (campo === "intensidadDolor") return "La intensidad debe ser un entero de 1 a 10";
  if (/must be one of the following values|unique/.test(msg)) return "Elige características válidas y sin repetir";
  return msg;
}

type Props = {
  expedienteId: number;
  /** Ausente = valoración nueva (aún sin guardar). */
  valoracion?: ValoracionDetalle;
  onCreada: (id: number) => void;
  onCerrada: (id: number) => void;
  onSalir: () => void;
};

const SIN_ESTADO: EstadoAntecedente = { presente: false, observacion: "" };

export default function ValoracionFormulario({ expedienteId, valoracion, onCreada, onCerrada, onSalir }: Props) {
  const qc = useQueryClient();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const confirmar = useConfirmacion();
  const { idUsuario, name } = useAuth();

  const crear = useCrearValoracion();
  const actualizar = useActualizarValoracion();
  const cerrar = useConfirmarValoracion();
  const guardarAntecedentes = useGuardarAntecedentesPersonales();
  const catalogo = useCatalogoQuery("antecedente-personal");

  const [base, setBase] = useState<Valoracion | undefined>(valoracion);
  const [valores, setValores] = useState<ValoresValoracion>(() => (valoracion ? valoresDesde(valoracion) : valoresIniciales()));
  // Lo último guardado (o lo que cargó el formulario): sirve para saber si hay cambios sin guardar.
  const [instantanea, setInstantanea] = useState<ValoresValoracion>(valores);
  const [filasGuardadas, setFilasGuardadas] = useState<AntecedentePersonalValoracion[]>(valoracion?.antecedentesPersonales ?? []);
  const [ediciones, setEdiciones] = useState<Record<number, EstadoAntecedente>>({});

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [faltantesAnt, setFaltantesAnt] = useState<Set<number>>(new Set());
  const [erroresCoherencia, setErroresCoherencia] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<string[]>(["antecedentes"]);
  const [enfocar, setEnfocar] = useState<string | null>(null);

  const ocupado = crear.isPending || actualizar.isPending || cerrar.isPending || guardarAntecedentes.isPending;

  // ---- antecedentes personales: ítems activos del catálogo + filas ya guardadas ----
  const itemsActivos = useMemo(() => (catalogo.data ?? []).filter((i) => i.activo), [catalogo.data]);
  const idsActivos = useMemo(() => new Set(itemsActivos.map((i) => i.id)), [itemsActivos]);
  const guardadosIds = useMemo(() => new Set(filasGuardadas.map((f) => f.antecedenteId)), [filasGuardadas]);
  const inactivosGuardados = useMemo(
    () => filasGuardadas.filter((f) => !idsActivos.has(f.antecedenteId)),
    [filasGuardadas, idsActivos],
  );

  const estadoEfectivo = (id: number): EstadoAntecedente => {
    if (ediciones[id]) return ediciones[id];
    const fila = filasGuardadas.find((f) => f.antecedenteId === id);
    return fila ? { presente: fila.presente, observacion: fila.observacion ?? "" } : SIN_ESTADO;
  };

  const valoresAntecedentes = useMemo(() => {
    const r: Record<number, EstadoAntecedente> = {};
    for (const i of itemsActivos) r[i.id] = estadoEfectivo(i.id);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsActivos, ediciones, filasGuardadas]);

  const itemsParaEnviar = (): AntecedentePersonalInput[] =>
    itemsActivos.map((i) => {
      const e = estadoEfectivo(i.id);
      return { antecedenteId: i.id, presente: e.presente, observacion: e.observacion.trim() || null };
    });

  // Hay que enviar si algún ítem activo no tiene fila o difiere de lo guardado.
  const antecedentesCambiaron = () =>
    itemsActivos.some((i) => {
      const fila = filasGuardadas.find((f) => f.antecedenteId === i.id);
      const e = estadoEfectivo(i.id);
      return !fila || fila.presente !== e.presente || (fila.observacion ?? "") !== e.observacion.trim();
    });

  // ---- aviso al salir con cambios sin guardar ----
  const antecedentesEditados = Object.entries(ediciones).some(([id, e]) => {
    const fila = filasGuardadas.find((f) => f.antecedenteId === Number(id));
    const guardado = fila ? { presente: fila.presente, observacion: fila.observacion ?? "" } : SIN_ESTADO;
    return guardado.presente !== e.presente || guardado.observacion.trim() !== e.observacion.trim();
  });
  const sinGuardar = antecedentesEditados || JSON.stringify(valores) !== JSON.stringify(instantanea);

  const { bloqueo, marcarGuardado } = useAvisoSalirSinGuardar(sinGuardar);

  // ---- cambios de valores ----
  const cambiar = (parche: Partial<ValoresValoracion>) => {
    setValores((v) => aplicarCambio(v, parche));
    setErrores((prev) => {
      const sig = { ...prev };
      for (const k of Object.keys(parche)) delete sig[k];
      return sig;
    });
  };

  const cambiarAntecedente = (id: number, parche: Partial<EstadoAntecedente>) => {
    setEdiciones((prev) => ({ ...prev, [id]: { ...estadoEfectivo(id), ...parche } }));
    setFaltantesAnt((prev) => {
      if (!prev.has(id)) return prev;
      const sig = new Set(prev);
      sig.delete(id);
      return sig;
    });
  };

  // ---- foco al primer campo con error (el contenido de un acordeón cerrado no está montado) ----
  useEffect(() => {
    if (!enfocar) return;
    let intentos = 0;
    const t = setInterval(() => {
      intentos += 1;
      const el = document.getElementById(enfocar);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
        clearInterval(t);
        setEnfocar(null);
      } else if (intentos >= 24) {
        clearInterval(t);
        setEnfocar(null);
      }
    }, 50);
    return () => clearInterval(t);
  }, [enfocar]);

  const abrirSecciones = (ids: SeccionId[]) =>
    setAbiertas((prev) => Array.from(new Set([...prev, ...ids])));

  const limpiarErrores = () => {
    setErrores({});
    setFaltantesAnt(new Set());
    setErroresCoherencia([]);
    setBanner(null);
  };

  // ---- errores del backend ----
  const procesarFaltantes = (data: ErrorConfirmar) => {
    const campos: Record<string, string> = {};
    const ant = new Set<number>();
    const claves: string[] = [];
    for (const f of data.faltantes ?? []) {
      if (f.startsWith("antecedentePersonal:")) {
        ant.add(Number(f.split(":")[1]));
        claves.push("antecedentePersonal");
      } else {
        campos[f] = TEXTO_FALTANTE;
        claves.push(f);
      }
    }
    // El backend manda también los pendientes con nombre: se resaltan por id en el checklist.
    for (const p of data.antecedentesPersonalesPendientes ?? []) ant.add(p.id);

    // Un ítem del catálogo creado mientras el formulario estaba abierto no está en pantalla:
    // se recarga el catálogo para poder resaltarlo (y mostrarlo como pendiente) por su nombre.
    if (Array.from(ant).some((id) => !idsActivos.has(id))) {
      qc.invalidateQueries({ queryKey: ["catalogos", "antecedente-personal"] });
    }

    setErrores(campos);
    setFaltantesAnt(ant);
    setBanner("Faltan datos para cerrar la valoración. Revisa los campos marcados.");

    abrirSecciones(claves.map((c) => SECCION_DE[c]).filter(Boolean));
    const primera = ORDEN_PANTALLA.find((c) => claves.includes(c)) ?? claves[0];
    if (primera === "antecedentePersonal") {
      const primerId = Array.from(ant).sort((a, b) => a - b)[0];
      setEnfocar(idCampo(`antecedente-${primerId}`));
    } else if (primera) {
      setEnfocar(idCampo(primera));
    }
  };

  const manejarError = (err: unknown) => {
    const status = statusDe(err);
    const data = dataDe<{ faltantes?: string[]; errores?: string[]; message?: string | string[] }>(err);

    if (status === 400) {
      if (data?.faltantes) return procesarFaltantes(data as ErrorConfirmar);
      if (Array.isArray(data?.errores)) {
        setErroresCoherencia(data.errores);
        return;
      }
      if (Array.isArray(data?.message)) {
        const campos: Record<string, string> = {};
        const otros: string[] = [];
        for (const m of data.message) {
          const campo = m.split(" ")[0];
          if (campo in SECCION_DE || campo === "fecha") campos[campo] = traducirFormato(campo, m);
          else otros.push(traducirFormato(campo, m));
        }
        setErrores((prev) => ({ ...prev, ...campos }));
        abrirSecciones(Object.keys(campos).map((c) => SECCION_DE[c]).filter(Boolean));
        if (otros.length) setBanner(otros.join(" · "));
        const primero = Object.keys(campos)[0];
        if (primero) setEnfocar(idCampo(primero));
        return;
      }
    }
    // 409 `EXPEDIENTE_INACTIVO` (por su código, no por el texto): distinto del 409 de «ya no está en borrador».
    if (esExpedienteInactivo(err)) {
      setBanner(MENSAJE_EXPEDIENTE_INACTIVO);
      refrescarExpediente();
      toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
      return;
    }
    if (status === 409) {
      setBanner(mensajeError(err, "La valoración ya no está en borrador."));
      toast.warning("La valoración cambió de estado", {
        description: "Se recargó: puede haber sido cerrada o anulada por otra persona.",
      });
      qc.invalidateQueries({ queryKey: valoracionKeys.raiz });
      return;
    }
    if (status === 404) {
      setBanner(mensajeError(err, "La valoración no existe."));
      qc.invalidateQueries({ queryKey: valoracionKeys.raiz });
      return;
    }
    // Sin respuesta del servidor = problema de conexión. En ambos casos lo escrito sigue en el formulario.
    if (esErrorDeRed(err)) {
      toast.error("No hay conexión con el servidor", {
        description: "Tus cambios siguen en el formulario. Revisa tu conexión e intenta guardar de nuevo.",
        duration: 6000,
      });
      return;
    }
    toast.error(mensajeError(err, "No se pudo guardar la valoración."), {
      description: "Tus cambios siguen en el formulario.",
    });
  };

  // ---- guardar: primero la cabecera (POST o PATCH) y después los antecedentes ----
  const guardar = async (): Promise<{ id: number; creada: boolean } | null> => {
    limpiarErrores();

    const parsed = valoracionBorradorSchema.safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]);
        if (!(k in campos)) campos[k] = issue.message;
      }
      setErrores(campos);
      abrirSecciones(Object.keys(campos).map((c) => SECCION_DE[c]).filter(Boolean));
      setEnfocar(idCampo(Object.keys(campos)[0]));
      return null;
    }

    const hayAntecedentes = idsActivos.size > 0;
    if (hayAntecedentes) {
      const ant = antecedentesPersonalesSchema.safeParse(itemsParaEnviar().map((a) => ({
        ...a, observacion: a.observacion ?? "",
      })));
      if (!ant.success) {
        setBanner(ant.error.issues[0]?.message ?? "Revisa las observaciones de los antecedentes.");
        abrirSecciones(["antecedentes"]);
        return null;
      }
    }

    const enviados = valores;
    try {
      let actual = base;
      let creada = false;
      if (!actual) {
        actual = await crear.mutateAsync({ expedienteId, body: construirPayloadCrear(valores) });
        creada = true;
        setBase(actual);
      } else {
        const body = construirPayloadActualizar(valores, actual);
        if (Object.keys(body).length) {
          actual = await actualizar.mutateAsync({ id: actual.id, body });
          setBase(actual);
        }
      }

      if (hayAntecedentes && antecedentesCambiaron()) {
        const filas = await guardarAntecedentes.mutateAsync({ id: actual.id, antecedentes: itemsParaEnviar() });
        setFilasGuardadas(filas);
        setEdiciones({});
      }
      setInstantanea(enviados);
      marcarGuardado();
      return { id: actual.id, creada };
    } catch (err) {
      manejarError(err);
      return null;
    }
  };

  const onGuardarBorrador = async () => {
    const r = await guardar();
    if (!r) return;
    toast.success("Borrador guardado");
    if (r.creada) onCreada(r.id);
  };

  const onCerrar = async () => {
    const ok = await confirmar(
      "¿Cerrar la valoración? Una valoración cerrada ya no se puede modificar: las correcciones se hacen con una nueva valoración o anulándola con justificación.",
    );
    if (!ok) return;
    const r = await guardar();
    if (!r) return;
    try {
      await cerrar.mutateAsync(r.id);
      toast.success("Valoración cerrada");
      onCerrada(r.id);
    } catch (err) {
      manejarError(err);
    }
  };

  const seccionConError = (id: SeccionId) =>
    Object.keys(errores).some((k) => SECCION_DE[k] === id) || (id === "antecedentes" && faltantesAnt.size > 0);

  const sinDolor = !valores.presentaDolor;
  const irradiado = valores.caracteristicasDolor.includes("irradiado");

  return (
    <div className="space-y-4">
      {(banner || erroresCoherencia.length > 0) && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {banner && <p>{banner}</p>}
          {erroresCoherencia.length > 0 && (
            <ul className="list-disc pl-5">
              {erroresCoherencia.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 xl:grid-cols-3">
        <div id={idCampo("fecha")} tabIndex={-1} className="space-y-2 outline-none">
          <Label>Fecha de la valoración</Label>
          <CalendarField className="w-full max-w-[240px]" disableFuture value={valores.fecha} onChange={(iso) => cambiar({ fecha: iso })} />
          {errores.fecha && <p className="text-sm text-red-700" role="alert">{errores.fecha}</p>}
        </div>
        <div className="space-y-2">
          <Label>Persona profesional responsable</Label>
          <p className="text-sm">
            <ResponsableValoracion id={base?.usuarioResponsableId ?? idUsuario} nombre={base ? base.usuarioResponsableNombre : name} />
          </p>
        </div>
        <div className="space-y-2">
          <Label>Estado de la valoración</Label>
          <div><EstadoValoracionBadge estado="borrador" anulado={false} /></div>
        </div>
      </div>

      <Accordion type="multiple" value={abiertas} onValueChange={setAbiertas}>
        {SECCIONES.map((s) => (
          <AccordionItem key={s.id} value={s.id} className="mb-4 rounded-md border px-4">
            <AccordionTrigger className="py-4 text-sm hover:cursor-pointer">
              <span className="flex items-center gap-2">
                {s.titulo}
                {seccionConError(s.id) && <Badge variant="denied">Revisar</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-4">
                {s.id === "antecedentes" && (
                  <>
                    <AntecedentesPersonalesChecklist
                      items={itemsActivos}
                      inactivos={inactivosGuardados}
                      valores={valoresAntecedentes}
                      guardados={guardadosIds}
                      mostrarPendientes={!!base && filasGuardadas.length > 0}
                      faltantes={faltantesAnt}
                      cargando={catalogo.isLoading}
                      errorCatalogo={catalogo.isError}
                      onChange={cambiarAntecedente}
                    />
                    <CampoValoracion nombre="otrosDiagnosticos" etiqueta="Otros diagnósticos" error={errores.otrosDiagnosticos}>
                      <TextareaAutoexpandible
                        id={idCampo("otrosDiagnosticos")}
                        value={valores.otrosDiagnosticos}
                        maxLength={20000}
                        mostrarContador
                        placeholder="Describe otros diagnósticos no listados"
                        onChange={(e) => cambiar({ otrosDiagnosticos: e.target.value })}
                      />
                    </CampoValoracion>
                  </>
                )}

                {s.id === "caidas" && (
                  <>
                    <Interruptor
                      nombre="antecedentesCaidas" etiqueta="Antecedentes de caídas"
                      checked={valores.antecedentesCaidas} onChange={(v) => cambiar({ antecedentesCaidas: v })}
                      error={errores.antecedentesCaidas}
                    />
                    <CampoValoracion nombre="detalleCaidas" etiqueta="Detalle" error={errores.detalleCaidas}>
                      <TextareaAutoexpandible
                        id={idCampo("detalleCaidas")} value={valores.detalleCaidas} maxLength={20000} mostrarContador
                        disabled={!valores.antecedentesCaidas}
                        aria-invalid={!!errores.detalleCaidas}
                        onChange={(e) => cambiar({ detalleCaidas: e.target.value })}
                      />
                    </CampoValoracion>
                    <Interruptor
                      nombre="usoAyudasBiomecanicas" etiqueta="Uso de ayudas biomecánicas"
                      checked={valores.usoAyudasBiomecanicas} onChange={(v) => cambiar({ usoAyudasBiomecanicas: v })}
                      error={errores.usoAyudasBiomecanicas}
                    />
                    <CampoValoracion nombre="detalleAyudasBiomecanicas" etiqueta="¿Cuáles?" error={errores.detalleAyudasBiomecanicas}>
                      <TextareaAutoexpandible
                        id={idCampo("detalleAyudasBiomecanicas")} value={valores.detalleAyudasBiomecanicas}
                        maxLength={20000} mostrarContador disabled={!valores.usoAyudasBiomecanicas}
                        aria-invalid={!!errores.detalleAyudasBiomecanicas}
                        onChange={(e) => cambiar({ detalleAyudasBiomecanicas: e.target.value })}
                      />
                    </CampoValoracion>
                  </>
                )}

                {s.id === "dolor" && (
                  <>
                    <Interruptor
                      nombre="presentaDolor" etiqueta="Presenta zona dolorosa"
                      checked={valores.presentaDolor} onChange={(v) => cambiar({ presentaDolor: v })}
                      error={errores.presentaDolor}
                    />
                    <CampoValoracion nombre="zonaDolorosa" etiqueta="Zona o zonas afectadas" error={errores.zonaDolorosa}>
                      <Input
                        id={idCampo("zonaDolorosa")} value={valores.zonaDolorosa} maxLength={255} disabled={sinDolor}
                        aria-invalid={!!errores.zonaDolorosa}
                        onChange={(e) => cambiar({ zonaDolorosa: e.target.value })}
                      />
                    </CampoValoracion>

                    <div className="space-y-2">
                      <Label>Características de la sensación</Label>
                      <div id={idCampo("caracteristicasDolor")} className="flex flex-wrap gap-x-6 gap-y-2">
                        {CARACTERISTICAS_DOLOR.map((c) => (
                          <label key={c} className={cn("flex items-center gap-2 text-sm capitalize", sinDolor && "opacity-50")}>
                            <Checkbox
                              checked={valores.caracteristicasDolor.includes(c)}
                              disabled={sinDolor}
                              onCheckedChange={(v) =>
                                cambiar({
                                  caracteristicasDolor: v === true
                                    ? [...valores.caracteristicasDolor, c]
                                    : valores.caracteristicasDolor.filter((x) => x !== c),
                                })
                              }
                            />
                            {c}
                          </label>
                        ))}
                      </div>
                      {errores.caracteristicasDolor && <p className="text-sm text-red-700" role="alert">{errores.caracteristicasDolor}</p>}
                    </div>

                    <CampoValoracion nombre="direccionIrradiacion" etiqueta="Dirección de la irradiación" error={errores.direccionIrradiacion}>
                      <Input
                        id={idCampo("direccionIrradiacion")} value={valores.direccionIrradiacion} maxLength={255}
                        disabled={sinDolor || !irradiado} aria-invalid={!!errores.direccionIrradiacion}
                        placeholder={irradiado ? "" : 'Se habilita al marcar "irradiado"'}
                        onChange={(e) => cambiar({ direccionIrradiacion: e.target.value })}
                      />
                    </CampoValoracion>

                    <div className="space-y-2">
                      <Label>Intensidad del dolor (1 a 10)</Label>
                      <div
                        id={idCampo("intensidadDolor")} tabIndex={-1} role="radiogroup" aria-label="Intensidad del dolor"
                        className={cn("flex flex-wrap gap-2 outline-none", sinDolor && "opacity-50")}
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n} type="button" role="radio" aria-checked={valores.intensidadDolor === n}
                            disabled={sinDolor}
                            onClick={() => cambiar({ intensidadDolor: valores.intensidadDolor === n ? null : n })}
                            className={cn(
                              "h-11 w-11 rounded-md border text-sm font-medium transition-colors",
                              valores.intensidadDolor === n
                                ? "border-[#A7074D] bg-[#A7074D] text-white"
                                : "bg-white hover:bg-muted disabled:hover:bg-white",
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      {errores.intensidadDolor && <p className="text-sm text-red-700" role="alert">{errores.intensidadDolor}</p>}
                    </div>
                  </>
                )}

                {s.id === "cognitivo" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Interruptor nombre="orientacionPersona" etiqueta="Orientación en persona"
                        checked={valores.orientacionPersona} onChange={(v) => cambiar({ orientacionPersona: v })}
                        error={errores.orientacionPersona} />
                      <Interruptor nombre="orientacionEspacio" etiqueta="Orientación en espacio"
                        checked={valores.orientacionEspacio} onChange={(v) => cambiar({ orientacionEspacio: v })}
                        error={errores.orientacionEspacio} />
                      <Interruptor nombre="orientacionTiempo" etiqueta="Orientación en tiempo"
                        checked={valores.orientacionTiempo} onChange={(v) => cambiar({ orientacionTiempo: v })}
                        error={errores.orientacionTiempo} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valoración global de consciencia y orientación</Label>
                      <RadioGroup
                        id={idCampo("conscienteOrientado")}
                        value={valores.conscienteOrientado ? "si" : "no"}
                        onValueChange={(v) => cambiar({ conscienteOrientado: v === "si" })}
                        className="flex flex-wrap gap-6"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="si" /> Consciente y orientado
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="no" /> No orientado
                        </label>
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground">
                        Criterio profesional: se registra de forma explícita y no se deduce de las tres orientaciones.
                      </p>
                    </div>
                    <TextoLargo nombre="cambiosConductuales" etiqueta="Cambios conductuales" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="estadosAnimo" etiqueta="Estados de ánimo" valores={valores} errores={errores} cambiar={cambiar} />
                  </>
                )}

                {s.id === "pruebas" && (
                  <>
                    <TextoLargo nombre="rangoMovimiento" etiqueta="Rango de movimiento" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="fuerzaMuscularDinamometria" etiqueta="Fuerza muscular y dinamometría" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="postura" etiqueta="Postura" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="riesgoUlcera" etiqueta="Riesgo de úlcera" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="diagnosticoDiferencial" etiqueta="Diagnóstico diferencial" valores={valores} errores={errores} cambiar={cambiar} />
                    <TextoLargo nombre="tratamiento" etiqueta="Tratamiento asignado (Tx)" valores={valores} errores={errores} cambiar={cambiar} />
                  </>
                )}

                {s.id === "avances" && (
                  <TextoLargo
                    nombre="avances" etiqueta="Avances" valores={valores} errores={errores} cambiar={cambiar}
                    ayuda="Observaciones sobre los avances del residente; se incluyen en el reporte semestral."
                  />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="flex flex-wrap gap-3 pt-2">
        <IfPerm perm={base ? PERM.terapiaFisica.actualizar : PERM.terapiaFisica.crear}>
          <BotonRegistro expedienteId={expedienteId} type="button" variant="outline" className="h-11 min-w-[200px]" disabled={ocupado} onClick={onGuardarBorrador}>
            {ocupado ? "Guardando…" : "Guardar borrador"}
          </BotonRegistro>
        </IfPerm>
        <IfPerm allOf={base ? [PERM.terapiaFisica.confirmar] : [PERM.terapiaFisica.crear, PERM.terapiaFisica.confirmar]}>
          <BotonRegistro expedienteId={expedienteId} type="button" variant="create" className="h-11 min-w-[200px]" disabled={ocupado} onClick={onCerrar}>
            Cerrar valoración
          </BotonRegistro>
        </IfPerm>
        <Button type="button" variant="ghost" className="h-11" onClick={onSalir}>Volver</Button>
      </div>

      <AvisoSalirDialogo bloqueo={bloqueo} />
    </div>
  );
}

type TextoLargoProps = {
  nombre: keyof ValoresValoracion & string;
  etiqueta: string;
  valores: ValoresValoracion;
  errores: Record<string, string>;
  cambiar: (parche: Partial<ValoresValoracion>) => void;
  ayuda?: string;
};

function TextoLargo({ nombre, etiqueta, valores, errores, cambiar, ayuda }: TextoLargoProps) {
  return (
    <CampoValoracion nombre={nombre} etiqueta={etiqueta} error={errores[nombre]}>
      <TextareaAutoexpandible
        id={idCampo(nombre)}
        value={String(valores[nombre] ?? "")}
        maxLength={20000}
        mostrarContador
        aria-invalid={!!errores[nombre]}
        onChange={(e) => cambiar({ [nombre]: e.target.value } as Partial<ValoresValoracion>)}
      />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </CampoValoracion>
  );
}
