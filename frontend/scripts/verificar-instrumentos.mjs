// Verifica las constantes de los instrumentos: Barthel-v1 y Tinetti-v1 (Terapia Física) y MNA-v1 (Nutrición).
// Uso: npm run verificar:instrumentos
//
// No hay un runner de pruebas en el repo: este script transpila los .ts de las constantes con el
// `typescript` ya instalado y comprueba sus invariantes. Los puntajes máximos se calculan SOLO aquí,
// nunca en la aplicación (el frontend no suma puntos: lo hace el backend).
//  1. Cantidad de ítems (10 y 20), `campo` únicos y etiquetas no vacías.
//  2. Máximos: Barthel 100; Tinetti equilibrio 16, marcha 12 y total 28.
//  3. Ningún `puntos` repetido dentro de un ítem.
//  4. Si existe docs/fase3/CONTRATO_BARTHEL_TINETTI.md (docs/ no se versiona), las constantes son
//     idénticas a los bloques JSON del contrato (campo, nombre, puntos y etiqueta).
//  5. MNA: 18 ítems (A–F cribaje y G–R evaluación, en orden), puntos múltiplos de 0,5 con medios solo en
//     K, M, P y Q; máximos cribaje 14, evaluación 16 y total 30; ítem Q = 0 / 0,5 / 1,0 (máximo 1,0); y,
//     si existe docs/fase3/CONTRATO_MNA.md, idénticos a sus dos bloques JSON.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import ts from "typescript";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INSTRUMENTOS = resolve(RAIZ, "src/modules/terapia-fisica/instrumentos");
const INSTRUMENTOS_NUTRICION = resolve(RAIZ, "src/modules/nutricion/instrumentos");
const CONTRATO = resolve(RAIZ, "docs/fase3/CONTRATO_BARTHEL_TINETTI.md");
const CONTRATO_MNA = resolve(RAIZ, "docs/fase3/CONTRATO_MNA.md");

async function cargar(archivo, exportado, carpeta = INSTRUMENTOS) {
  const fuente = readFileSync(resolve(carpeta, archivo), "utf8");
  const js = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
  return modulo[exportado];
}

const fallas = [];
const falla = (msg) => fallas.push(msg);
const maximo = (items) => items.reduce((s, i) => s + Math.max(...i.opciones.map((o) => o.puntos)), 0);

// `medios`: los puntos pueden ser múltiplos de 0,5 (MNA); si no, enteros no negativos.
function verificarInstrumento(nombre, def, { version, items, maximos, medios = false }) {
  if (def.version !== version) falla(`${nombre}: versión «${def.version}», se esperaba «${version}»`);
  const todos = def.secciones.flatMap((s) => s.items);
  if (todos.length !== items) falla(`${nombre}: ${todos.length} ítems, se esperaban ${items}`);

  const campos = new Set();
  for (const item of todos) {
    if (campos.has(item.campo)) falla(`${nombre}: campo repetido «${item.campo}»`);
    campos.add(item.campo);
    if (!item.nombre?.trim()) falla(`${nombre}.${item.campo}: nombre vacío`);
    if (item.opciones.length < 2) falla(`${nombre}.${item.campo}: menos de 2 opciones`);
    const puntos = item.opciones.map((o) => o.puntos);
    if (new Set(puntos).size !== puntos.length) falla(`${nombre}.${item.campo}: puntos repetidos (${puntos.join(", ")})`);
    if (puntos.some((p) => (medios ? !Number.isInteger(p * 2) : !Number.isInteger(p)) || p < 0)) {
      falla(`${nombre}.${item.campo}: puntos ${medios ? "que no son múltiplos de 0,5" : "no enteros"} o negativos`);
    }
    for (const o of item.opciones) if (!o.etiqueta?.trim()) falla(`${nombre}.${item.campo}: etiqueta vacía (${o.puntos})`);
  }

  for (const [clave, esperado] of Object.entries(maximos)) {
    const seccion = clave === "total" ? null : def.secciones.find((s) => s.clave === clave);
    const real = clave === "total" ? maximo(todos) : seccion ? maximo(seccion.items) : NaN;
    if (real !== esperado) falla(`${nombre}: máximo de «${clave}» = ${real}, se esperaba ${esperado}`);
  }
  console.log(`${nombre}: ${todos.length} ítems · máximos ${Object.entries(maximos).map(([k, v]) => `${k} ${v}`).join(", ")} · sin repetidos`);
}

function compararConContrato(barthel, tinetti) {
  if (!existsSync(CONTRATO)) {
    console.log("Contrato no encontrado (docs/ no se versiona): se omite la comparación con los bloques JSON.");
    return;
  }
  const bloques = [...readFileSync(CONTRATO, "utf8").matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));
  if (bloques.length < 2) return falla("Contrato: no se encontraron los dos bloques JSON");
  const [cBarthel, cTinetti] = bloques;

  const igual = (nombre, real, esperado) => {
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(real)), esperado)) falla(`${nombre}: difiere del bloque JSON del contrato`);
  };
  igual("Barthel (ítems)", barthel.secciones[0].items, cBarthel.items);
  igual("Tinetti (equilibrio)", tinetti.secciones.find((s) => s.clave === "equilibrio").items, cTinetti.equilibrio);
  igual("Tinetti (marcha)", tinetti.secciones.find((s) => s.clave === "marcha").items, cTinetti.marcha);
  if (barthel.version !== cBarthel.version) falla("Barthel: versión distinta a la del contrato");
  if (tinetti.version !== cTinetti.version) falla("Tinetti: versión distinta a la del contrato");
  console.log("Contrato: las constantes coinciden con los bloques JSON (campo, nombre, puntos y etiqueta).");
}

function verificarMna(def) {
  verificarInstrumento("MNA-v1", def, { version: "MNA-v1", items: 18, maximos: { cribaje: 14, evaluacion: 16, total: 30 }, medios: true });

  const campos = def.secciones.flatMap((s) => s.items.map((i) => i.campo));
  const esperados = "ABCDEFGHIJKLMNOPQR".split("").map((l) => `item${l}`);
  if (!isDeepStrictEqual(campos, esperados)) falla(`MNA-v1: campos ${campos.join(", ")}, se esperaban ${esperados.join(", ")}`);
  const tamanos = def.secciones.map((s) => `${s.clave}:${s.items.length}`).join(", ");
  if (tamanos !== "cribaje:6, evaluacion:12") falla(`MNA-v1: secciones ${tamanos}, se esperaban cribaje:6, evaluacion:12`);

  // Medios puntos solo en K, M, P y Q (y en todos ellos).
  const conMedios = def.secciones.flatMap((s) => s.items).filter((i) => i.opciones.some((o) => !Number.isInteger(o.puntos))).map((i) => i.campo);
  if (!isDeepStrictEqual(conMedios, ["itemK", "itemM", "itemP", "itemQ"])) falla(`MNA-v1: medios puntos en ${conMedios.join(", ")}, se esperaban itemK, itemM, itemP, itemQ`);

  // Decisión P2: el ítem Q vale 0 / 0,5 / 1,0 (nunca 2,0).
  const q = def.secciones.flatMap((s) => s.items).find((i) => i.campo === "itemQ");
  const puntosQ = q?.opciones.map((o) => o.puntos);
  if (Math.max(...(puntosQ ?? [NaN])) !== 1) falla(`MNA-v1.itemQ: máximo ${Math.max(...(puntosQ ?? [NaN]))}, se esperaba 1,0 (P2)`);
  if (!isDeepStrictEqual(puntosQ, [0, 0.5, 1])) falla(`MNA-v1.itemQ: puntos ${puntosQ?.join(", ")}, se esperaban 0, 0.5, 1`);
}

function compararMnaConContrato(mna) {
  if (!existsSync(CONTRATO_MNA)) {
    console.log("Contrato MNA no encontrado (docs/ no se versiona): se omite la comparación con los bloques JSON.");
    return;
  }
  const bloques = [...readFileSync(CONTRATO_MNA, "utf8").matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => JSON.parse(m[1]));
  if (bloques.length < 2) return falla("Contrato MNA: no se encontraron los dos bloques JSON (cribaje y evaluación)");
  const [cCribaje, cEvaluacion] = bloques;
  const antes = fallas.length;

  const igual = (nombre, real, esperado) => {
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(real)), esperado)) falla(`${nombre}: difiere del bloque JSON del contrato`);
  };
  igual("MNA (cribaje A–F)", mna.secciones.find((s) => s.clave === "cribaje").items, cCribaje.items);
  igual("MNA (evaluación G–R)", mna.secciones.find((s) => s.clave === "evaluacion").items, cEvaluacion.items);
  if (mna.version !== cCribaje.version || mna.version !== cEvaluacion.version) falla("MNA: versión distinta a la del contrato");
  if (fallas.length === antes) console.log("Contrato MNA: la constante coincide con los bloques JSON (campo, nombre, puntos y etiqueta).");
}

const barthel = await cargar("barthelV1.ts", "BARTHEL_V1");
const tinetti = await cargar("tinettiV1.ts", "TINETTI_V1");

verificarInstrumento("Barthel-v1", barthel, { version: "Barthel-v1", items: 10, maximos: { items: 100, total: 100 } });
verificarInstrumento("Tinetti-v1", tinetti, { version: "Tinetti-v1", items: 20, maximos: { equilibrio: 16, marcha: 12, total: 28 } });
compararConContrato(barthel, tinetti);

const mna = await cargar("mnaV1.ts", "MNA_V1", INSTRUMENTOS_NUTRICION);
verificarMna(mna);
compararMnaConContrato(mna);

if (fallas.length) {
  console.error(`\nFALLÓ la verificación (${fallas.length}):`);
  for (const f of fallas) console.error(` - ${f}`);
  process.exit(1);
}
console.log("\nOK: instrumentos verificados.");
