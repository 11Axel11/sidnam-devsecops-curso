import { formatearInstanteCR } from "./fechaClinica";
import ResponsableValoracion from "./ResponsableValoracion";
import type { RegistroAuditable } from "./tipos";

type Props = {
  registro: RegistroAuditable;
  /** Una sola línea tenue (celdas de tabla): solo «Registrado por …, fecha». */
  compacta?: boolean;
};

// «Registrado por <nombre>, dd/mm/aaaa HH:mm» y, si hubo modificación (`modificadoPorId` ≠ null), «Modificado
// por <nombre>, dd/mm/aaaa HH:mm» (CA-26). Las fechas van SIEMPRE en hora de Costa Rica (`formatearInstanteCR`),
// nunca en la zona del navegador. Solo lectura.
export default function AuditoriaRegistro({ registro: r, compacta }: Props) {
  const registrado = (
    <>Registrado por <ResponsableValoracion id={r.creadoPorId} nombre={r.creadoPorNombre} />, {formatearInstanteCR(r.fechaCreacion)}</>
  );
  if (compacta) return <span className="block whitespace-normal text-xs text-muted-foreground">{registrado}</span>;
  return (
    <div className="space-y-0.5">
      <p>{registrado}</p>
      {r.modificadoPorId !== null && (
        <p>
          Modificado por <ResponsableValoracion id={r.modificadoPorId} nombre={r.modificadoPorNombre} />, {formatearInstanteCR(r.fechaModificacion)}
        </p>
      )}
    </div>
  );
}
