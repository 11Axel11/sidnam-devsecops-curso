// Números de los instrumentos clínicos en pantalla: coma decimal es-CR y, como mucho, 1 decimal (los
// medios puntos del MNA). Solo presentación: en el payload los números viajan con punto (JSON).
const numero = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });

export const formatearNumeroClinico = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : numero.format(n);
