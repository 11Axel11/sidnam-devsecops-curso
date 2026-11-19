import type { ReactNode } from "react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/animate-ui/radix/accordion";
import { Label } from "@/components/ui/label";
import type { ValoracionDetalle } from "../models/valoracion";
import { formatearFechaClinica, formatearInstanteCR } from "@/components/app/clinico/fechaClinica";
import EstadoValoracionBadge from "@/components/app/clinico/EstadoValoracionBadge";
import AuditoriaRegistro from "@/components/app/clinico/AuditoriaRegistro";
import ResponsableValoracion from "@/components/app/clinico/ResponsableValoracion";

const si = (v: boolean) => (v ? "Sí" : "No");

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground">{etiqueta}</Label>
      <div className="whitespace-pre-wrap break-words text-sm">{children}</div>
    </div>
  );
}

const texto = (t: string | null) => (t && t.trim() ? t : "—");

// Vista de solo lectura: se usa para la vigente, las reemplazadas, las anuladas y los borradores
// que la persona no puede editar. No hay controles.
export default function ValoracionLectura({ valoracion: v }: { valoracion: ValoracionDetalle }) {
  const presentes = v.antecedentesPersonales.filter((a) => a.presente);
  const descartados = v.antecedentesPersonales.filter((a) => !a.presente);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2 xl:grid-cols-3">
        <Dato etiqueta="Fecha de la valoración">{formatearFechaClinica(v.fecha)}</Dato>
        <Dato etiqueta="Persona profesional responsable"><ResponsableValoracion id={v.usuarioResponsableId} nombre={v.usuarioResponsableNombre} /></Dato>
        <Dato etiqueta="Estado de la valoración"><EstadoValoracionBadge estado={v.estado} anulado={v.anulado} /></Dato>
        <Dato etiqueta="Registro">
          <AuditoriaRegistro registro={v} />
        </Dato>
      </div>

      {v.anulado && (
        <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <p className="mb-2 font-semibold">Valoración anulada</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Dato etiqueta="Motivo">{texto(v.motivoAnulacion)}</Dato>
            <Dato etiqueta="Anulada por"><ResponsableValoracion id={v.anuladoPorId} nombre={v.anuladoPorNombre} /></Dato>
            <Dato etiqueta="Fecha de anulación">{formatearInstanteCR(v.fechaAnulacion)}</Dato>
          </div>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["antecedentes", "traumaticos", "caidas", "dolor", "cognitivo", "pruebas", "avances"]}>
        <AccordionItem value="antecedentes" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Antecedentes personales</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              {v.antecedentesPersonales.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin antecedentes personales registrados.</p>
              ) : (
                <>
                  <Dato etiqueta="Presentes">
                    {presentes.length === 0 ? "Ninguno" : (
                      <ul className="list-disc pl-5">
                        {presentes.map((a) => (
                          <li key={a.antecedenteId}>
                            {a.nombre}{a.observacion ? ` — ${a.observacion}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Dato>
                  <Dato etiqueta="Evaluados y descartados">
                    {descartados.length === 0 ? "—" : descartados.map((a) => a.nombre).join(", ")}
                  </Dato>
                </>
              )}
              <Dato etiqueta="Otros diagnósticos">{texto(v.otrosDiagnosticos)}</Dato>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="traumaticos" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Antecedentes traumáticos</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-4">
              {v.antecedentesTraumaticos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin antecedentes traumáticos registrados.</p>
              ) : (
                <ul className="space-y-3">
                  {v.antecedentesTraumaticos.map((a) => (
                    <li key={a.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">{a.tipo.nombre}</p>
                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Dato etiqueta="Localización anatómica">{texto(a.localizacionAnatomica)}</Dato>
                        <Dato etiqueta="Tiempo transcurrido">{texto(a.tiempoTranscurrido)}</Dato>
                        <Dato etiqueta="Descripción">{texto(a.descripcion)}</Dato>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Se registran y editan en la pestaña «Antecedentes traumáticos».
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="caidas" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Antecedentes de caídas y ayudas biomecánicas</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <Dato etiqueta="Antecedentes de caídas">{si(v.antecedentesCaidas)}</Dato>
              {v.antecedentesCaidas && <Dato etiqueta="Detalle">{texto(v.detalleCaidas)}</Dato>}
              <Dato etiqueta="Uso de ayudas biomecánicas">{si(v.usoAyudasBiomecanicas)}</Dato>
              {v.usoAyudasBiomecanicas && <Dato etiqueta="¿Cuáles?">{texto(v.detalleAyudasBiomecanicas)}</Dato>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dolor" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Valoración del dolor</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <Dato etiqueta="Presenta zona dolorosa">{si(v.presentaDolor)}</Dato>
              {v.presentaDolor && (
                <>
                  <Dato etiqueta="Zona o zonas afectadas">{texto(v.zonaDolorosa)}</Dato>
                  <Dato etiqueta="Características de la sensación">
                    {v.caracteristicasDolor && v.caracteristicasDolor.length ? v.caracteristicasDolor.join(", ") : "—"}
                  </Dato>
                  {v.caracteristicasDolor?.includes("irradiado") && (
                    <Dato etiqueta="Dirección de la irradiación">{texto(v.direccionIrradiacion)}</Dato>
                  )}
                  <Dato etiqueta="Intensidad del dolor (1 a 10)">
                    {v.intensidadDolor !== null ? `${v.intensidadDolor} / 10` : "—"}
                  </Dato>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cognitivo" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Estado cognitivo y conductual</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Dato etiqueta="Orientación en persona">{si(v.orientacionPersona)}</Dato>
                <Dato etiqueta="Orientación en espacio">{si(v.orientacionEspacio)}</Dato>
                <Dato etiqueta="Orientación en tiempo">{si(v.orientacionTiempo)}</Dato>
              </div>
              <Dato etiqueta="Valoración global">{v.conscienteOrientado ? "Consciente y orientado" : "No orientado"}</Dato>
              <Dato etiqueta="Cambios conductuales">{texto(v.cambiosConductuales)}</Dato>
              <Dato etiqueta="Estados de ánimo">{texto(v.estadosAnimo)}</Dato>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pruebas" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Pruebas generales, diagnóstico diferencial y tratamiento</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <Dato etiqueta="Rango de movimiento">{texto(v.rangoMovimiento)}</Dato>
              <Dato etiqueta="Fuerza muscular y dinamometría">{texto(v.fuerzaMuscularDinamometria)}</Dato>
              <Dato etiqueta="Postura">{texto(v.postura)}</Dato>
              <Dato etiqueta="Riesgo de úlcera">{texto(v.riesgoUlcera)}</Dato>
              <Dato etiqueta="Diagnóstico diferencial">{texto(v.diagnosticoDiferencial)}</Dato>
              <Dato etiqueta="Tratamiento asignado (Tx)">{texto(v.tratamiento)}</Dato>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="avances" className="mb-4 rounded-md border px-4">
          <AccordionTrigger className="py-4 text-sm">Avances</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-4">
              <Dato etiqueta="Avances">{texto(v.avances)}</Dato>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
