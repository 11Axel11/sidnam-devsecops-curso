/**
 * Índice de masa corporal (RF-NU-01, RN-08): `IMC = peso (kg) / talla (m)²`, con la talla digitada en
 * centímetros, redondeado a 1 decimal. Se calcula SOLO en el backend, se almacena con el control y no se
 * recalcula (RN-04). Función pura, sin base de datos (regla 6 de docs/CLAUDE.md).
 *
 * No hay `versionInstrumento` porque no es un instrumento versionado: es la definición estándar y el ERD
 * no trae esa columna.
 *
 * Redondeo exacto: peso y talla se capturan con a lo sumo 1 decimal, así que el cálculo se hace en
 * ENTEROS (décimas) y el redondeo es «la mitad hacia arriba» sin ruido de coma flotante. Con `double`
 * (80,6 kg y 200 cm = 20,15 exactos) saldría 20,1 en vez de 20,2. Si algún valor trae más decimales
 * (la función es pública) se usa coma flotante con redondeo a la mitad hacia arriba.
 */

const esMultiploDeUnaDecima = (v: number): boolean => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9;

/** Redondea a 1 decimal (mitad hacia arriba). Evita devolver `-0`. */
export function redondearUnDecimal(valor: number): number {
  return Math.round((valor + Number.EPSILON * Math.sign(valor)) * 10) / 10 + 0;
}

/**
 * @param pesoKg   peso en kilogramos (> 0)
 * @param tallaCm  talla en CENTÍMETROS (> 0)
 * @returns IMC en kg/m² con 1 decimal (CA-14: 58,4 kg y 152 cm → 25,3)
 * @throws RangeError si peso o talla no son números finitos positivos (el DTO ya los acota a rangos clínicos)
 */
export function calcularImc(pesoKg: number, tallaCm: number): number {
  if (!Number.isFinite(pesoKg) || !Number.isFinite(tallaCm) || pesoKg <= 0 || tallaCm <= 0) {
    throw new RangeError('peso y talla deben ser números finitos mayores que cero');
  }
  if (esMultiploDeUnaDecima(pesoKg) && esMultiploDeUnaDecima(tallaCm)) {
    // peso = p/10 kg, talla = t/10 cm  ⇒  IMC×10 = p·10⁶ / t²  (redondeo entero a la mitad hacia arriba)
    const p = Math.round(pesoKg * 10);
    const t = Math.round(tallaCm * 10);
    const t2 = t * t;
    return Math.floor((2 * p * 1_000_000 + t2) / (2 * t2)) / 10;
  }
  const tallaM = tallaCm / 100;
  return redondearUnDecimal(pesoKg / (tallaM * tallaM));
}
