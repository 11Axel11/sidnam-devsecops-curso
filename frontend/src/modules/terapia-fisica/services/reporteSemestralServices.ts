import sidnamAPI from "@/api/apiConfig";

export interface ParametrosReporteSemestral {
  anio: number;
  semestre: 1 | 2;
  /** Texto libre con su título (p. ej. «Dra. Mariela Vargas»); viaja tal cual y solo si tiene texto. */
  profesionalNombre?: string;
  profesionalCodigo?: string;
}

// El PDF puede tardar en generarse: timeout explícito de 60 s solo para esta petición.
const TIMEOUT_PDF_MS = 60_000;

export const getReporteSemestralPdf = async (p: ParametrosReporteSemestral): Promise<Blob> => {
  const params: Record<string, string | number> = { anio: p.anio, semestre: p.semestre };
  if (p.profesionalNombre) params.profesionalNombre = p.profesionalNombre;
  if (p.profesionalCodigo) params.profesionalCodigo = p.profesionalCodigo;
  const { data } = await sidnamAPI.get<Blob>("/reportes/terapia-fisica/semestral/pdf", {
    params, responseType: "blob", timeout: TIMEOUT_PDF_MS,
  });
  return data;
};
