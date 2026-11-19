type Props = {
  id: number | null | undefined;
  /** Nombre que devuelve el backend junto al id (`…Nombre`, CA-26); `null` si no se pudo resolver. */
  nombre?: string | null;
};

// Persona que registró, modificó, anuló o es responsable de un registro: muestra el NOMBRE que devuelve el
// backend y cae a «Usuario #id» solo si el nombre no viene (null). Sin id, «—». No consulta la sesión.
export default function ResponsableValoracion({ id, nombre }: Props) {
  if (id === null || id === undefined) return <>—</>;
  const limpio = nombre?.trim();
  return <>{limpio ? limpio : `Usuario #${id}`}</>;
}
