import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import TextareaAutoexpandible from "@/components/app/TextareaAutoexpandible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCatalogoQuery } from "@/modules/catalogos/hooks/catalogosHooks";
import { dataDe, esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import {
  useActualizarAntecedenteTraumatico, useCrearAntecedenteTraumatico, valoracionKeys,
} from "../hooks/valoracionHooks";
import type { AntecedenteTraumaticoValoracion } from "../models/valoracion";
import { crearAntecedenteTraumaticoSchema } from "../schemas/antecedenteTraumaticoSchema";
import {
  CAMPOS_TRAUMATICO, payloadActualizarTraumatico, payloadCrearTraumatico,
  traducirFormatoTraumatico, valoresDesdeTraumatico, valoresVaciosTraumatico,
  type ValoresAntecedenteTraumatico,
} from "../utils/antecedenteTraumatico";
import { idCampo } from "@/components/app/clinico/idCampo";
import { esExpedienteInactivo, MENSAJE_EXPEDIENTE_INACTIVO } from "@/components/app/clinico/expedienteInactivo";
import { useExpedienteActivo } from "@/components/app/clinico/useExpedienteActivo";
import { MENSAJE_RED, toastRedCaida } from "@/components/app/clinico/mensajesRed";
import { esTipoOtro } from "@/components/app/clinico/tipoOtro";
import CampoValoracion from "@/components/app/clinico/CampoValoracion";

type Props = {
  expedienteId: number;
  valoracionId: number;
  /** Si viene, se edita ese registro; si no, es un alta. */
  registro?: AntecedenteTraumaticoValoracion;
  onClose: () => void;
};

type Errores = Partial<Record<(typeof CAMPOS_TRAUMATICO)[number], string>>;

// El padre lo monta solo mientras está abierto (con `key`), así cada apertura arranca con su estado.
export default function AntecedenteTraumaticoDialogo({ expedienteId, valoracionId, registro, onClose }: Props) {
  const { refrescar: refrescarExpediente } = useExpedienteActivo(expedienteId);
  const qc = useQueryClient();
  const crear = useCrearAntecedenteTraumatico();
  const actualizar = useActualizarAntecedenteTraumatico();
  const catalogo = useCatalogoQuery("tipo-antecedente-traumatico");

  const [valores, setValores] = useState<ValoresAntecedenteTraumatico>(
    () => (registro ? valoresDesdeTraumatico(registro) : valoresVaciosTraumatico()),
  );
  const [errores, setErrores] = useState<Errores>({});
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const editando = !!registro;
  const guardando = crear.isPending || actualizar.isPending;

  // Al editar, el tipo guardado puede haberse desactivado después: se conserva como opción
  // para poder corregir otros campos (el backend solo exige tipo activo cuando el tipo cambia).
  const opciones = useMemo(() => {
    const activos = (catalogo.data ?? []).filter((i) => i.activo).map((i) => ({ ...i, etiqueta: i.nombre }));
    if (registro && !activos.some((i) => i.id === registro.tipoId)) {
      return [...activos, { id: registro.tipo.id, nombre: registro.tipo.nombre, etiqueta: `${registro.tipo.nombre} (desactivado)` }];
    }
    return activos;
  }, [catalogo.data, registro]);

  const nombreTipo = (opciones.find((o) => o.id === valores.tipoId)?.nombre) ?? "";
  const esOtro = esTipoOtro(nombreTipo);

  const cambiar = (parche: Partial<ValoresAntecedenteTraumatico>, campo: keyof Errores) => {
    setValores((v) => ({ ...v, ...parche }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    setErroresServidor([]);
    setAviso(null);
  };

  const refrescar = () => qc.invalidateQueries({ queryKey: valoracionKeys.raiz });

  const manejarError = (err: unknown) => {
    const status = statusDe(err);
    const data = dataDe<{ errores?: string[]; message?: string | string[] }>(err);

    if (status === 400) {
      if (Array.isArray(data?.errores)) { setErroresServidor(data.errores); return; }
      if (Array.isArray(data?.message)) {
        const campos: Errores = {};
        const otros: string[] = [];
        for (const m of data.message) {
          const campo = m.split(" ")[0] as keyof Errores;
          if (CAMPOS_TRAUMATICO.includes(campo)) campos[campo] = traducirFormatoTraumatico(campo, m);
          else otros.push(traducirFormatoTraumatico(campo, m));
        }
        setErrores((prev) => ({ ...prev, ...campos }));
        if (otros.length) setErroresServidor(otros);
        return;
      }
    }
    // 409 `EXPEDIENTE_INACTIVO`: lo cerraron con el diálogo abierto. No se cierra: lo escrito se conserva.
    if (esExpedienteInactivo(err)) {
      setAviso(MENSAJE_EXPEDIENTE_INACTIVO);
      refrescarExpediente();
      toast.warning("Expediente inactivo", { description: "Tus cambios siguen en el formulario." });
      return;
    }
    if (status === 409) {
      toast.warning(mensajeError(err, "La valoración ya no está en borrador."), {
        description: "Se recargó la pantalla: pasó a solo lectura.",
      });
      refrescar();
      onClose();
      return;
    }
    if (status === 404) {
      toast.error(editando ? "El antecedente ya no existe." : "La valoración ya no existe.");
      refrescar();
      onClose();
      return;
    }
    // Sin respuesta del servidor = problema de conexión: el diálogo sigue abierto con lo escrito.
    if (esErrorDeRed(err)) {
      setAviso(MENSAJE_RED);
      toastRedCaida();
      return;
    }
    setAviso(mensajeError(err, "No se pudo guardar el antecedente."));
  };

  const guardar = async () => {
    setErroresServidor([]);
    setAviso(null);

    const parsed = crearAntecedenteTraumaticoSchema(esOtro).safeParse(valores);
    if (!parsed.success) {
      const campos: Errores = {};
      for (const issue of parsed.error.issues) {
        const campo = issue.path[0] as keyof Errores;
        if (!campos[campo]) campos[campo] = issue.message;
      }
      setErrores(campos);
      return;
    }
    setErrores({});

    try {
      if (registro) {
        const body = payloadActualizarTraumatico(valores, registro);
        if (Object.keys(body).length === 0) {
          toast.info("No hay cambios que guardar.");
          onClose();
          return;
        }
        await actualizar.mutateAsync({ id: registro.id, body });
        toast.success("Antecedente actualizado");
      } else {
        await crear.mutateAsync({ valoracionId, body: payloadCrearTraumatico(valores) });
        toast.success("Antecedente registrado");
      }
      onClose();
    } catch (err) {
      manejarError(err);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto && !guardando) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar antecedente traumático" : "Nuevo antecedente traumático"}</DialogTitle>
          <DialogDescription>
            Cada antecedente es un registro independiente y se guarda al instante, sin esperar a «Guardar borrador».
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => { e.preventDefault(); void guardar(); }}
        >
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

          <CampoValoracion nombre="tipoId" etiqueta="Tipo de antecedente (obligatorio)" error={errores.tipoId}>
            <Select
              value={valores.tipoId ? String(valores.tipoId) : ""}
              onValueChange={(v) => cambiar({ tipoId: Number(v) }, "tipoId")}
              disabled={catalogo.isLoading}
            >
              <SelectTrigger id={idCampo("tipoId")} className="w-full" aria-invalid={!!errores.tipoId}>
                <SelectValue placeholder={catalogo.isLoading ? "Cargando…" : "Selecciona un tipo"} />
              </SelectTrigger>
              <SelectContent>
                {opciones.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.etiqueta}</SelectItem>)}
              </SelectContent>
            </Select>
            {catalogo.isError && (
              <p className="text-sm text-red-700" role="alert">No se pudo cargar el catálogo de tipos de antecedente.</p>
            )}
          </CampoValoracion>

          <CampoValoracion nombre="localizacionAnatomica" etiqueta="Localización anatómica" error={errores.localizacionAnatomica}>
            <Input
              id={idCampo("localizacionAnatomica")}
              maxLength={255}
              placeholder="Ej. Cadera derecha"
              aria-invalid={!!errores.localizacionAnatomica}
              value={valores.localizacionAnatomica}
              onChange={(e) => cambiar({ localizacionAnatomica: e.target.value }, "localizacionAnatomica")}
            />
          </CampoValoracion>

          <CampoValoracion nombre="tiempoTranscurrido" etiqueta="Tiempo transcurrido" error={errores.tiempoTranscurrido}>
            <Input
              id={idCampo("tiempoTranscurrido")}
              maxLength={255}
              placeholder="Ej. Hace 2 años"
              aria-invalid={!!errores.tiempoTranscurrido}
              value={valores.tiempoTranscurrido}
              onChange={(e) => cambiar({ tiempoTranscurrido: e.target.value }, "tiempoTranscurrido")}
            />
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
              aria-invalid={!!errores.descripcion}
              value={valores.descripcion}
              onChange={(e) => cambiar({ descripcion: e.target.value }, "descripcion")}
            />
          </CampoValoracion>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={guardando}>Cancelar</Button>
            <Button type="submit" variant="create" disabled={guardando}>
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar antecedente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
