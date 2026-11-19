export const isFutureLocal = (yyyyMmDd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return false;

  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const selected = new Date(y, m - 1, d);
  const today = new Date();

  selected.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return selected.getTime() > today.getTime();
};