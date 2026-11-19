import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import AvisoSalirDialogo from "@/components/app/clinico/AvisoSalirDialogo";
import { esExpedienteInactivo, MENSAJE_EXPEDIENTE_INACTIVO } from "@/components/app/clinico/expedienteInactivo";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import BotonRegistro from "@/components/app/clinico/BotonRegistro";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import { idCampo } from "@/components/app/clinico/idCampo";
import Interruptor from "@/components/app/clinico/Interruptor";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";
import { useAvisoSalirSinGuardar } from "@/components/app/clinico/useAvisoSalirSinGuardar";
import IfPerm from "@/components/auth/IfPerm";
import CalendarField from "@/components/CalendarField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useConfirmacion } from "@/hooks/useConfirmar";
import { PERM } from "@/lib/permisosClinicos";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import { dataDe, esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import {
  useActualizarValoracionNutricional, useConfirmarValoracionNutricional, useCrearValoracionNutricional,
  valoracionNutricionalKeys,
} from "../hooks/valoracionNutricionalHooks";
import {
  ETIQUETA_NIVEL_DETERIORO, esNivelDeterioro, NIVELES_DETERIORO,
  type ErrorConfirmarNutricion, type ValoracionNutricional, type ValoracionNutricionalDetalle,
} from "../models/valoracionNutricional";
import { crearValoracionNutricionalBorradorSchema } from "../schemas/valoracionNutricionalSchema";
import { CAMPOS_VALORACION_NUTRICIONAL, traducirFormato } from "../utils/errores";
import {
  aplicarCambio, construirPayloadActualizar, construirPayloadCrear, valoresDesde, valoresIniciales,
  type ValoresValoracionNutricional,
} from "../utils/valoracionNutricionalForm";

const TEXTO_FALTANTE = "Obligatorio para cerrar la valoración";

// Orden en pantalla para llevar el foco al primer campo faltante.
const ORDEN_PANTALLA = ["fecha", "datoFuncionalId", "detalleAlergiaMedicamentos", "nivelDeterioroCognitivo"];

type Props = {
  expedienteId: number;
  /** Ausente = valoración nueva (aún sin guardar). */
  valoracion?: ValoracionNutricionalDetalle;
  onCreada: (id: number) => void;
  onCerrada: (id: number) => void;
  onSalir: () => void;
};

function Apartado({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 py-4 first:pt-0 last:pb-0">
      <h5 className="text-sm font-semibold">{titulo}</h5>
      {children}
    </section>
  );
}

export default function ValoracionNutricionalFormulario({ expedienteId, valoracion, onCreada, onCerrada, onSalir }: Props) {
  const qc = useQueryClient();
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const confirmar = useConfirmacion();
  const { idUsuario, name } = useAuth();

  const crear = useCrearValoracionNutricional();
  const actualizar = useActualizarValoracionNutricional();
  const cerrar = useConfirmarValoracionNutricional();
  const catalogo = useCatalogoQuery("dato-funcional-nutricion");

  const [base, setBase] = useState<ValoracionNutricional | undefined>(valoracion);
  const [valores, setValores] = useState<ValoresValoracionNutricional>(() => (valoracion ? valoresDesde(valoracion) : valoresIniciales()));
  // Lo último guardado (o lo que cargó el formulario): sirve para saber si hay cambios sin guardar.
  const [instantanea, setInstantanea] = useState<ValoresValoracionNutricional>(valores);

  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresCoherencia, setErroresCoherencia] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [enfocar, setEnfocar] = useState<string | null>(null);

  const ocupado = crear.isPending || actualizar.isPending || cerrar.isPending;

  // ---- dato funcional: ítems activos + el ya guardado si se desactivó después (solo historial) ----
  const datoGuardado = valoracion?.datoFuncional ?? null;
  const opciones = useMemo(() => {
    const activos = (catalogo.data ?? []).filter((i) => i.activo).map((i) => ({ id: i.id, etiqueta: i.nombre }));
    if (datoGuardado && !activos.some((i) => i.id === datoGuardado.id)) {
      return [...activos, { id: datoGuardado.id, etiqueta: `${datoGuardado.nombre} (desactivado)` }];
    }
    return activos;
  }, [catalogo.data, datoGuardado]);

  // ---- aviso al salir con cambios sin guardar ----
  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(instantanea);
  const { bloqueo, marcarGuardado } = useAvisoSalirSinGuardar(sinGuardar);

  // ---- cambios de valores ----
  const cambiar = (parche: Partial<ValoresValoracionNutricional>) => {
    setValores((v) => aplicarCambio(v, parche));
    setErrores((prev) => {
      const sig = { ...prev };
      for (const k of Object.keys(parche)) delete sig[k];
      // Al apagar el interruptor desaparece su dependiente: su error ya no aplica.
      if ("alergiaMedicamentos" in parche) delete sig.detalleAlergiaMedicamentos;
      if ("estadoCognitivo" in parche) delete sig.nivelDeterioroCognitivo;
      return sig;
    });
  };

  // ---- foco al primer campo con error ----
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

  const limpiarErrores = () => {
    setErrores({});
    setErroresCoherencia([]);
    setBanner(null);
  };

  // ---- errores del backend ----
  const procesarFaltantes = (data: ErrorConfirmarNutricion) => {
    const campos: Record<string, string> = {};
    for (const f of data.faltantes ?? []) campos[f] = TEXTO_FALTANTE;
    setErrores(campos);
    setBanner("Faltan datos para cerrar la valoración. Revisa los campos marcados.");
    const claves = Object.keys(campos);
    const primera = ORDEN_PANTALLA.find((c) => claves.includes(c)) ?? claves[0];
    if (primera) setEnfocar(idCampo(primera));
  };

  const manejarError = (err: unknown) => {
    const status = statusDe(err);
    const data = dataDe<{ faltantes?: string[]; errores?: string[]; message?: string | string[] }>(err);

    if (status === 400) {
      if (data?.faltantes) return procesarFaltantes(data as ErrorConfirmarNutricion);
      if (Array.isArray(data?.errores)) {
        setErroresCoherencia(data.errores);
        return;
      }
      if (Array.isArray(data?.message)) {
        const campos: Record<string, string> = {};
        const otros: string[] = [];
        for (const m of data.message) {
          const campo = m.split(" ")[0];
          if ((CAMPOS_VALORACION_NUTRICIONAL as readonly string[]).includes(campo)) campos[campo] = traducirFormato(campo, m);
          else otros.push(traducirFormato(campo, m));
        }
        setErrores((prev) => ({ ...prev, ...campos }));
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
      qc.invalidateQueries({ queryKey: valoracionNutricionalKeys.raiz });
      return;
    }
    if (status === 404) {
      setBanner(mensajeError(err, "La valoración no existe."));
      qc.invalidateQueries({ queryKey: valoracionNutricionalKeys.raiz });
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

  // ---- guardar (POST la primera vez, luego PATCH solo con lo que cambió) ----
  const guardar = async (): Promise<{ id: number; creada: boolean } | null> => {
    limpiarErrores();

    const parsed = crearValoracionNutricionalBorradorSchema(base?.nivelDeterioroCognitivo ?? "").safeParse(valores);
    if (!parsed.success) {
      const campos: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0]);
        if (!(k in campos)) campos[k] = issue.message;
      }
      setErrores(campos);
      setEnfocar(idCampo(Object.keys(campos)[0]));
      return null;
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
      "¿Cerrar la valoración? Una valoración cerrada ya no se puede modificar y la valoración vigente anterior pasará a «Cerrada (historial)». Las correcciones se hacen con una nueva valoración o anulándola con justificación.",
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

  const conDeterioro = valores.estadoCognitivo === "con_deterioro";
  // Valor que traía el borrador y no es de la lista (era texto libre): se ofrece tal cual como «valor anterior».
  const nivelAnterior = base?.nivelDeterioroCognitivo ?? "";
  const nivelHistorico = nivelAnterior.trim() !== "" && !esNivelDeterioro(nivelAnterior) && valores.nivelDeterioroCognitivo === nivelAnterior
    ? nivelAnterior
    : "";

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

      <section className="space-y-2">
        <h4 className="font-semibold">Historia clínica — datos generales</h4>
        <div className="divide-y rounded-md border p-4 text-left">
          <Apartado titulo="Datos biomédicos">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Interruptor nombre="problemaVisual" etiqueta="Problema visual"
                checked={valores.problemaVisual} onChange={(v) => cambiar({ problemaVisual: v })}
                error={errores.problemaVisual} />
              <Interruptor nombre="problemaCavidadOral" etiqueta="Problema de cavidad oral"
                checked={valores.problemaCavidadOral} onChange={(v) => cambiar({ problemaCavidadOral: v })}
                error={errores.problemaCavidadOral} />
            </div>
          </Apartado>

          <Apartado titulo="Datos farmacológicos">
            <Interruptor nombre="alergiaMedicamentos" etiqueta="Alergia a medicamentos"
              checked={valores.alergiaMedicamentos} onChange={(v) => cambiar({ alergiaMedicamentos: v })}
              error={errores.alergiaMedicamentos} />
            <CampoValoracion nombre="detalleAlergiaMedicamentos" etiqueta="¿Cuáles?" error={errores.detalleAlergiaMedicamentos}>
              <TextareaAutoexpandible
                id={idCampo("detalleAlergiaMedicamentos")}
                value={valores.detalleAlergiaMedicamentos}
                maxLength={20000}
                mostrarContador
                disabled={!valores.alergiaMedicamentos}
                placeholder={valores.alergiaMedicamentos ? "Ej. Penicilina" : "Solo si hay alergia a medicamentos"}
                aria-invalid={!!errores.detalleAlergiaMedicamentos}
                onChange={(e) => cambiar({ detalleAlergiaMedicamentos: e.target.value })}
              />
            </CampoValoracion>
          </Apartado>

          <Apartado titulo="Datos funcionales">
            <CampoValoracion nombre="datoFuncionalId" etiqueta="Selección única" error={errores.datoFuncionalId}>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={valores.datoFuncionalId !== null ? String(valores.datoFuncionalId) : ""}
                  onValueChange={(v) => cambiar({ datoFuncionalId: Number(v) })}
                  disabled={catalogo.isLoading}
                >
                  <SelectTrigger id={idCampo("datoFuncionalId")} className="w-full max-w-sm" aria-invalid={!!errores.datoFuncionalId}>
                    <SelectValue placeholder={catalogo.isLoading ? "Cargando…" : "Selecciona un dato funcional"} />
                  </SelectTrigger>
                  <SelectContent>
                    {opciones.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.etiqueta}</SelectItem>)}
                  </SelectContent>
                </Select>
                {valores.datoFuncionalId !== null && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => cambiar({ datoFuncionalId: null })}>
                    Quitar selección
                  </Button>
                )}
              </div>
              {catalogo.isError && (
                <p className="text-sm text-red-700" role="alert">No se pudo cargar el catálogo de datos funcionales.</p>
              )}
            </CampoValoracion>
          </Apartado>

          <Apartado titulo="Datos cognitivos">
            <div className="space-y-2">
              <Label>Estado cognitivo</Label>
              <RadioGroup
                id={idCampo("estadoCognitivo")}
                value={valores.estadoCognitivo}
                onValueChange={(v) => cambiar({ estadoCognitivo: v === "con_deterioro" ? "con_deterioro" : "normal" })}
                className="flex flex-wrap gap-6"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="normal" /> Normal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="con_deterioro" /> Con deterioro cognitivo
                </label>
              </RadioGroup>
              {errores.estadoCognitivo && <p className="text-sm text-red-700" role="alert">{errores.estadoCognitivo}</p>}
            </div>
            <CampoValoracion nombre="nivelDeterioroCognitivo" etiqueta="Nivel de deterioro cognitivo" error={errores.nivelDeterioroCognitivo}>
              <Select
                value={valores.nivelDeterioroCognitivo}
                onValueChange={(v) => cambiar({ nivelDeterioroCognitivo: v })}
                disabled={!conDeterioro}
              >
                <SelectTrigger id={idCampo("nivelDeterioroCognitivo")} className="w-full max-w-sm" aria-invalid={!!errores.nivelDeterioroCognitivo}>
                  <SelectValue placeholder={conDeterioro ? "Selecciona un nivel" : "Solo si hay deterioro cognitivo"} />
                </SelectTrigger>
                <SelectContent>
                  {NIVELES_DETERIORO.map((n) => <SelectItem key={n} value={n}>{ETIQUETA_NIVEL_DETERIORO[n]}</SelectItem>)}
                  {/* Valor histórico (era texto libre): se muestra tal cual mientras no se cambie. */}
                  {nivelHistorico && <SelectItem value={nivelHistorico}>{nivelHistorico} (valor anterior)</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Solo disponible con deterioro cognitivo. Elige Leve, Moderado o Severo.
              </p>
            </CampoValoracion>
          </Apartado>

          <Apartado titulo="Datos emocionales">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Interruptor nombre="depresion" etiqueta="Depresión"
                checked={valores.depresion} onChange={(v) => cambiar({ depresion: v })}
                error={errores.depresion} />
              <Interruptor nombre="ansiedad" etiqueta="Ansiedad"
                checked={valores.ansiedad} onChange={(v) => cambiar({ ansiedad: v })}
                error={errores.ansiedad} />
            </div>
          </Apartado>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <IfPerm perm={base ? PERM.nutricion.actualizar : PERM.nutricion.crear}>
          <BotonRegistro expedienteId={expedienteId} type="button" variant="outline" className="h-11 min-w-[200px]" disabled={ocupado} onClick={onGuardarBorrador}>
            {ocupado ? "Guardando…" : "Guardar borrador"}
          </BotonRegistro>
        </IfPerm>
        <IfPerm allOf={base ? [PERM.nutricion.confirmar] : [PERM.nutricion.crear, PERM.nutricion.confirmar]}>
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
