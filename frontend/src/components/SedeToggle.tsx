import type { Sede } from "@/store/sedeStore";
import { nombreSede } from "@/lib/sede";

type Props<T extends string> = {
  value: T;
  onChange?: (v: T) => void;
  opciones: T[];
  disabled?: boolean;
};

export default function SedeToggle<T extends Sede | 'ambas'>({ value, onChange, opciones, disabled }: Props<T>) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {opciones.map((o) => {
        const activo = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={disabled && !activo}
            onClick={() => !disabled && onChange?.(o)}
            className={`rounded-full border px-4 py-1 text-sm transition ${
              activo ? 'border-[#A7074D] bg-[#A7074D] text-white' : 'bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white'
            }`}
          >
            {o === 'ambas' ? 'Ambas' : nombreSede[o as Sede]}
          </button>
        );
      })}
    </div>
  );
}
