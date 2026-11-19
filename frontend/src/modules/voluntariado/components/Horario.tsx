import type { solicitudVoluntariadoHorarioProps } from "../types/voluntariadoProps";

const Horario = ({ horario }: solicitudVoluntariadoHorarioProps) => {
  const horaMin = 7;
  const horaMax = 17;

  const calcularPorcentaje = (horaStr: string) => {
    const [h, m] = horaStr.split(":").map(Number);
    const horaDecimal = h + m / 60;
    return ((horaDecimal - horaMin) / (horaMax - horaMin)) * 100;
  };

  return (
    <div className="w-full mx-auto">
      <div className="flex text-sm font-semibold mb-2 pl-[100px]">
        {Array.from({ length: horaMax - horaMin }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-center border-l border-gray-300"
          >
            {horaMin + i <= 12
              ? `${horaMin + i} AM`
              : `${(horaMin + i) - 12} PM`}
          </div>
        ))}
      </div>

      {horario.map((h) => {
        const left = calcularPorcentaje(h.horaInicio);
        const width = calcularPorcentaje(h.horaFin) - left;

        return (
          <div key={h.dia} className="flex items-center gap-4 mb-4">
            <div className="w-[100px] font-medium">{h.dia}</div>
            <div className="relative w-full h-6 bg-gray-100 rounded overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-amaranthPink-800 rounded-lg"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Horario
