import { TriangleAlert } from "lucide-react";
import { formatearFechaClinica, formatearInstanteCR } from "@/components/app/clinico/fechaClinica";
import WebLoader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { esErrorDeRed, mensajeError, statusDe } from "@/utils/apiError";
import { useFichaResumen } from "../hooks/fichaResumenHooks";
import type { Bloque } from "../models/fichaResumen";
import FilaFicha from "./FilaFicha";

type Props = {
  expedienteId: number;
  onClose: () => void;
};

const textoError = (err: unknown): string => {
  if (esErrorDeRed(err)) return "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.";
  const status = statusDe(err);
  if (status === 403) return "No tienes acceso a la ficha resumen de este expediente.";
  if (status === 404) return "No se encontró el expediente.";
  return mensajeError(err, "No se pudo cargar la ficha resumen.");
};

// «Sí — cuáles» / «No», tal como lo trae el bloque.
const siConDetalle = (presenta: boolean, cuales: string | null, no: string) =>
  presenta ? `Sí${cuales ? ` — ${cuales}` : ""}` : no;

// Si el bloque no trae datos, `null` (la fila muestra el motivo).
const de = <T,>(b: Bloque<T>, f: (d: T) => string): string | null => (b.datos === null ? null : f(b.datos));

// Ficha resumen interdisciplinaria (RF-TR-01), solo lectura. Se monta solo mientras está abierta, así la
// consulta arranca al abrir. Muestra exactamente los bloques del contrato; cada uno sin datos muestra su motivo.
export default function FichaResumenDialogo({ expedienteId, onClose }: Props) {
  const ficha = useFichaResumen(expedienteId, true);
  const f = ficha.data;
  const sinReintento = statusDe(ficha.error) === 403 || statusDe(ficha.error) === 404;

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ficha resumen interdisciplinaria</DialogTitle>
          <DialogDescription>Solo lectura — vista consolidada para personal de otros departamentos.</DialogDescription>
        </DialogHeader>

        {ficha.isLoading ? (
          <WebLoader />
        ) : ficha.error ? (
          <div role="alert" className="space-y-3 rounded-md border p-4 text-left text-sm">
            <p>{textoError(ficha.error)}</p>
            {!sinReintento && (
              <Button type="button" variant="outline" size="sm" disabled={ficha.isFetching} onClick={() => void ficha.refetch()}>
                {ficha.isFetching ? "Reintentando…" : "Reintentar"}
              </Button>
            )}
          </div>
        ) : f ? (
          <div>
            {/* CA-17: la alergia a medicamentos va destacada con el acento de marca. */}
            <section
              aria-label="Alergia a medicamentos"
              className="mb-2 flex items-start gap-3 rounded-md border border-amaranthPink bg-amaranthPink/5 px-4"
            >
              <TriangleAlert className="mt-3.5 h-5 w-5 shrink-0 text-amaranthPink" aria-hidden />
              <div className="flex-1">
                <FilaFicha
                  etiqueta="Alergia a medicamentos"
                  motivo={f.alergiaMedicamentos.motivo}
                  valor={de(f.alergiaMedicamentos, (d) => siConDetalle(d.presenta, d.cuales, "No registrada"))}
                />
              </div>
            </section>

            <FilaFicha
              etiqueta="Grado de dependencia (Barthel)"
              motivo={f.dependenciaBarthel.motivo}
              valor={de(f.dependenciaBarthel, (d) => d.grado)}
              aparte={f.dependenciaBarthel.datos && formatearFechaClinica(f.dependenciaBarthel.datos.fecha)}
            />
            <FilaFicha
              etiqueta="Condición de movilidad"
              motivo={f.condicionMovilidad.motivo}
              valor={de(f.condicionMovilidad, (d) => d.condicion)}
            />
            <FilaFicha
              etiqueta="Uso de ayudas biomecánicas"
              motivo={f.ayudasBiomecanicas.motivo}
              valor={de(f.ayudasBiomecanicas, (d) => siConDetalle(d.usa, d.cuales, "No"))}
            />
            {/* Dos filas: el antecedente sale de la valoración y el evento de otro registro; juntos podrían leerse como contradicción. */}
            <FilaFicha
              etiqueta="Antecedentes de caídas (según la valoración)"
              motivo={f.antecedentesCaidas.motivo}
              valor={de(f.antecedentesCaidas, (d) => (d.presenta ? "Sí" : "No"))}
            />
            <FilaFicha
              etiqueta="Último evento de caída"
              motivo={f.ultimoEventoCaida.motivo}
              valor={de(f.ultimoEventoCaida, (d) => formatearInstanteCR(d.fechaHora))}
            />
            <FilaFicha
              etiqueta="Última valoración de Terapia Física"
              motivo={f.ultimaValoracionTerapiaFisica.motivo}
              valor={de(f.ultimaValoracionTerapiaFisica, (d) => formatearFechaClinica(d.fecha))}
              aparte={f.ultimaValoracionTerapiaFisica.datos?.estado}
            />
            <FilaFicha
              etiqueta="Última valoración de Nutrición"
              motivo={f.ultimaValoracionNutricion.motivo}
              valor={de(f.ultimaValoracionNutricion, (d) => formatearFechaClinica(d.fecha))}
              aparte={f.ultimaValoracionNutricion.datos?.estado}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
