export const generarHoras = () => {
  const times: string[] = [];
  for (let h = 7; h <= 17; h++) {
    times.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 17) times.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return times;
};