/**
 * Contenido inicial de los catálogos, tomado del documento de requerimientos
 * (RF-TF-02, RF-TF-03, RF-TF-07, RF-NU-04 y Anexo C.2). Es solo un punto de
 * partida: el departamento los administra después desde la aplicación.
 */

// RF-TF-02: el documento dice «quince antecedentes» pero enumera 17 nombres
// (con «marcapasos» y «enfermedades cardiacas y dispositivos» por separado y
// con condición psiquiátrica/cognitiva, tabaquismo y alcoholismo «además de»).
// Se siembran los 17 literales; cualquiera sobrante se desactiva desde la app.
export const ANTECEDENTES_PERSONALES = [
  'Hipertensión arterial',
  'Cáncer',
  'Diabetes',
  'Colitis',
  'Asma',
  'Gastritis',
  'Enfermedades coronarias',
  'Alergias',
  'Migrañas',
  'Enfermedades reumáticas',
  'Trombosis o tromboflebitis',
  'Hipotiroidismo',
  'Marcapasos',
  'Enfermedades cardiacas y dispositivos',
  'Condición psiquiátrica o cognitiva',
  'Tabaquismo',
  'Alcoholismo',
];

// RF-TF-03. «Otro» exige descripción obligatoria (regla de B.1.4): el servicio
// de antecedentes traumáticos identifica ese tipo por este nombre (comparación
// sin mayúsculas ni espacios). Es el ÚNICO lugar donde aparece el literal.
export const TIPO_ANTECEDENTE_TRAUMATICO_OTRO = 'Otro';
export const TIPOS_ANTECEDENTE_TRAUMATICO = ['Fractura', 'Esguince', 'Cirugía', 'Luxación', TIPO_ANTECEDENTE_TRAUMATICO_OTRO];

// RF-TF-07. «Otro» exige descripción obligatoria: el servicio de eventos importantes identifica ese
// tipo por esta constante (comparación sin mayúsculas ni espacios), igual que en los traumáticos.
export const TIPO_EVENTO_IMPORTANTE_OTRO = 'Otro';
// RF-TR-01 (ficha resumen): «fecha del último evento de caída». El catálogo no tiene bandera ni id fijo, así que el tipo
// «Caída» se identifica SOLO por esta constante (comparación sin mayúsculas ni espacios), igual que «Otro»; si algún día se
// renombrara ese ítem habría que migrar a una bandera en el catálogo.
export const TIPO_EVENTO_IMPORTANTE_CAIDA = 'Caída';
export const TIPOS_EVENTO_IMPORTANTE = [
  TIPO_EVENTO_IMPORTANTE_CAIDA,
  'Cambio de medicación',
  'Crisis médica',
  'Hospitalización',
  'Infección',
  TIPO_EVENTO_IMPORTANTE_OTRO,
];

// RF-NU-04.
export const DATOS_FUNCIONALES_NUTRICION = [
  'Ambulante',
  'Deambula con ayuda',
  'Silla de ruedas',
  'Encamado',
  'Amputado',
  'Dependencia total',
];

// Anexo C.2 (Test de Movimiento y Coordinación).
export const EJERCICIOS_TEST_MOVIMIENTO = [
  'Transferencias de sedente a bípedo',
  'Flexiones de hombro',
  'Velocidad en marcha',
];
