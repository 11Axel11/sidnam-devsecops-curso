import type { Sede } from "@/store/sedeStore";
import { nombreSede } from "@/lib/sede";


export default function SedeBadge({ sede }: { sede: Sede }) {
  return (
    <span className="rounded-full bg-[#A7074D] px-3 py-1 text-xs font-medium text-white">
      Sede: {nombreSede[sede]}
    </span>
  );
}
