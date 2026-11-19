import type { DefinicionInstrumento } from "@/components/app/clinico/instrumento";

// Escala de Tinetti — Tinetti-v1 (RF-TF-09, Anexo B, Tablas 21 y 22). Transcrito de los bloques JSON de
// docs/fase3/CONTRATO_BARTHEL_TINETTI.md §2.1 (generados desde las constantes del backend): campos,
// puntos y etiquetas EXACTOS. Los títulos de parte y sus instrucciones son los del contrato. No se edita
// a mano: ante un cambio del instrumento se actualiza el contrato y se corre `npm run verificar:instrumentos`.
export const TINETTI_V1 = {
  version: "Tinetti-v1",
  secciones: [
    {
      clave: "equilibrio",
      titulo: "Parte I — Equilibrio (máx. 16)",
      instruccion: "La persona debe estar sentada en una silla dura y sin brazos; deben describirse los resultados de las maniobras.",
      items: [
        {
          campo: "equilibrioSentado",
          nombre: "Equilibrio sentado",
          opciones: [
            { puntos: 0, etiqueta: "Se inclina o desliza en la silla" },
            { puntos: 1, etiqueta: "Firme y seguro" },
          ],
        },
        {
          campo: "levantarse",
          nombre: "Levantarse",
          opciones: [
            { puntos: 0, etiqueta: "Incapaz sin ayuda" },
            { puntos: 1, etiqueta: "Capaz utilizando los brazos como ayuda" },
            { puntos: 2, etiqueta: "Capaz sin utilizar los brazos" },
          ],
        },
        {
          campo: "intentosLevantarse",
          nombre: "Intentos de levantarse",
          opciones: [
            { puntos: 0, etiqueta: "Incapaz sin ayuda" },
            { puntos: 1, etiqueta: "Capaz, pero necesita más de un intento" },
            { puntos: 2, etiqueta: "Capaz de levantarse en el primer intento" },
          ],
        },
        {
          campo: "equilibrioInmediato",
          nombre: "Equilibrio inmediato (primeros 5 segundos al levantarse)",
          opciones: [
            { puntos: 0, etiqueta: "Inestable: se tambalea, mueve los pies, marcado balanceo del tronco" },
            { puntos: 1, etiqueta: "Estable, pero usa andador, bastón, muletas u otros objetos de soporte" },
            { puntos: 2, etiqueta: "Estable sin usar bastón u otros soportes" },
          ],
        },
        {
          campo: "equilibrioEnPie",
          nombre: "Equilibrio en pie",
          opciones: [
            { puntos: 0, etiqueta: "Inestable" },
            { puntos: 1, etiqueta: "Estable con aumento de la base de sustentación: talones separados más de 10 cm, o usa bastón, andador u otras ayudas" },
            { puntos: 2, etiqueta: "Base de sustentación estrecha: no requiere ayudas" },
          ],
        },
        {
          campo: "empujon",
          nombre: "Empujón (el examinador empuja ligeramente el esternón con la palma de la mano tres veces, con la persona de pie y los pies tan juntos como sea posible)",
          opciones: [
            { puntos: 0, etiqueta: "Tiende a caerse" },
            { puntos: 1, etiqueta: "Se tambalea, se sujeta, pero se mantiene solo" },
            { puntos: 2, etiqueta: "Firme" },
          ],
        },
        {
          campo: "ojosCerrados",
          nombre: "Ojos cerrados (en la posición del ítem 6)",
          opciones: [
            { puntos: 0, etiqueta: "Inestable" },
            { puntos: 1, etiqueta: "Estable" },
          ],
        },
        {
          campo: "giro360Continuidad",
          nombre: "Giro de 360° — continuidad de los pasos",
          opciones: [
            { puntos: 0, etiqueta: "Pasos discontinuos" },
            { puntos: 1, etiqueta: "Pasos continuos" },
          ],
        },
        {
          campo: "giro360Estabilidad",
          nombre: "Giro de 360° — estabilidad",
          opciones: [
            { puntos: 0, etiqueta: "Inestable: se agarra a algo o se tambalea" },
            { puntos: 1, etiqueta: "Estable" },
          ],
        },
        {
          campo: "sentarse",
          nombre: "Sentarse",
          opciones: [
            { puntos: 0, etiqueta: "Inseguro: calcula mal la distancia, cae en la silla" },
            { puntos: 1, etiqueta: "Usa los brazos o tiene un movimiento que no es suave" },
            { puntos: 2, etiqueta: "Seguro, movimiento suave" },
          ],
        },
      ],
    },
    {
      clave: "marcha",
      titulo: "Parte II — Marcha (máx. 12)",
      instruccion: "La persona, de pie junto al examinador, camina por el pasillo o la habitación, primero con su paso habitual y regresando con paso rápido pero seguro, con sus ayudas habituales.",
      items: [
        {
          campo: "inicioMarcha",
          nombre: "Inicio de la marcha (inmediatamente después de decirle «camine»)",
          opciones: [
            { puntos: 0, etiqueta: "Cualquier duda o vacilación, o múltiples intentos para comenzar" },
            { puntos: 1, etiqueta: "No está vacilante" },
          ],
        },
        {
          campo: "longitudPasoDerecho",
          nombre: "Longitud del paso — balanceo del pie derecho",
          opciones: [
            { puntos: 0, etiqueta: "No sobrepasa el pie izquierdo con el paso" },
            { puntos: 1, etiqueta: "Sobrepasa el pie izquierdo al dar el paso" },
          ],
        },
        {
          campo: "alturaPasoDerecho",
          nombre: "Altura del paso — pie derecho",
          opciones: [
            { puntos: 0, etiqueta: "El pie derecho no se levanta completamente del suelo al dar el paso" },
            { puntos: 1, etiqueta: "Se levanta completamente del suelo" },
          ],
        },
        {
          campo: "longitudPasoIzquierdo",
          nombre: "Longitud del paso — balanceo del pie izquierdo",
          opciones: [
            { puntos: 0, etiqueta: "No sobrepasa el pie derecho con el paso" },
            { puntos: 1, etiqueta: "Sobrepasa el pie derecho al dar el paso" },
          ],
        },
        {
          campo: "alturaPasoIzquierdo",
          nombre: "Altura del paso — pie izquierdo",
          opciones: [
            { puntos: 0, etiqueta: "El pie izquierdo no se levanta completamente del suelo al dar el paso" },
            { puntos: 1, etiqueta: "Se levanta completamente del suelo" },
          ],
        },
        {
          campo: "simetriaPaso",
          nombre: "Simetría del paso",
          opciones: [
            { puntos: 0, etiqueta: "La longitud del paso con el pie derecho y con el izquierdo es diferente (estimada)" },
            { puntos: 1, etiqueta: "Los pasos son de igual longitud" },
          ],
        },
        {
          campo: "continuidadPasos",
          nombre: "Continuidad de los pasos",
          opciones: [
            { puntos: 0, etiqueta: "Se detiene o hay discontinuidad entre los pasos" },
            { puntos: 1, etiqueta: "Los pasos son continuos" },
          ],
        },
        {
          campo: "trayectoria",
          nombre: "Trayectoria (estimada en relación con baldosines de 30 cm; se observa la desviación de un pie en 3 m de recorrido)",
          opciones: [
            { puntos: 0, etiqueta: "Desviación marcada" },
            { puntos: 1, etiqueta: "Desviación moderada o leve, o utiliza ayudas" },
            { puntos: 2, etiqueta: "Recto, sin utilizar ayudas" },
          ],
        },
        {
          campo: "tronco",
          nombre: "Tronco",
          opciones: [
            { puntos: 0, etiqueta: "Marcado balanceo o utiliza ayudas para caminar" },
            { puntos: 1, etiqueta: "No hay balanceo, pero hay flexión de las rodillas o espalda, o separa los brazos hacia fuera" },
            { puntos: 2, etiqueta: "No hay balanceo, no hay flexión, no utiliza los brazos ni usa ayudas" },
          ],
        },
        {
          campo: "posturaMarcha",
          nombre: "Postura de la marcha",
          opciones: [
            { puntos: 0, etiqueta: "Talones separados" },
            { puntos: 1, etiqueta: "Talones que casi se tocan mientras camina" },
          ],
        },
      ],
    },
  ],
} as const satisfies DefinicionInstrumento;
