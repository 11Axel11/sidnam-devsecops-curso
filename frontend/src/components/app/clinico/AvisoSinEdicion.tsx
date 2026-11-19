type Props = {
  /** Qué no se edita, con su artículo: «Los controles», «Las evaluaciones»… */
  sujeto: string;
  /** Cómo se corrige: «anula el control (con motivo) y regístralo de nuevo». */
  correccion: string;
};

// Nota fija de las series sin edición: corregir un error es anular (con motivo) y registrar de nuevo.
export default function AvisoSinEdicion({ sujeto, correccion }: Props) {
  return (
    <p role="note" className="rounded-md border bg-muted/40 p-3 text-sm">
      {sujeto} no se editan. Para corregir un error, {correccion}.
    </p>
  );
}
