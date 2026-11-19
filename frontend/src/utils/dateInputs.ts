/* eslint-disable prefer-const */
export function toDateInput(value?: string | null): string {
  if (!value) return "";

  const v = String(value).trim().replace(/\//g, "-");

  // YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss...
  {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }

  // DD-MM-YYYY
  {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }

  // DD-MM-YY 
  {
    const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(v);
    if (m) {
      const dd = m[1], mm = m[2], yy = Number(m[3]);
      const full = yy >= 70 ? 1900 + yy : 2000 + yy;
      return `${full}-${mm}-${dd}`;
    }
  }

  // MM-DD-YYYY 
  {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
    if (m) {
      const mm = Number(m[1]), dd = Number(m[2]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return `${m[3]}-${m[1]}-${m[2]}`;
      }
    }
  }

  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return "";
}

// para normalizar fechas


export const toYMD = (val: string | Date | undefined | null) => {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const ymdFromDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// DD/MM/YYYY o DD-MM-YYYY -> YYYY-MM-DD
export const dmyToYmd = (s: string) => {
  const m = s.match(/^(\d{1,2})[\\/-](\d{1,2})[\\/-](\d{2}|\d{4})$/);
  if (!m) return "";
  let [ , d, mo, y ] = m;
  if (y.length === 2) y = (Number(y) >= 70 ? "19" : "20") + y; // opcional
  const day = String(Number(d)).padStart(2, "0");
  const month = String(Number(mo)).padStart(2, "0");
  return `${y}-${month}-${day}`;
};

// Acepta Date | YYYY-MM-DD | DD/MM/YYYY | DD-MM-YYYY
export const normalizeToYmd = (val?: string | Date | null) => {
  if (!val) return "";
  if (val instanceof Date) return ymdFromDate(val);
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;         // ya está bien
  if (/^\d{1,2}[\\/-]\d{1,2}[\\/-](\d{2}|\d{4})$/.test(val)) return dmyToYmd(val);
  return ""; // formato desconocido
};