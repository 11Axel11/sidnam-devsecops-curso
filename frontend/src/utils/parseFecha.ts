
export function parseFechaDDMMYY(s?: string) {
    if (!s) return '—';
    const [dd, mm, yy] = s.split('-');
    if (!dd || !mm || !yy) return s;
    return `${dd}/${mm}/20${yy}`;
}
