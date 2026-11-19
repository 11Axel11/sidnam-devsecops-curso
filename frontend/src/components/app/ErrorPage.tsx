import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

import Error403Img from "@/assets/403.png";
import Error404Img from "@/assets/404.png";
import Error500Img from "@/assets/500.png";

type Action =
  | { type: "link"; label: string; to: string }
  | { type: "reload"; label: string };

type Palette = {
  bg: string;
  fg: string;
  text: string;
};

const CODE_PALETTES: Record<string | number, Palette> = {
  401: { bg: "#FFE4E6", fg: "#E11D48", text: "#881337" },
  403: { bg: "#FFE4E6", fg: "#E11D48", text: "#881337" },
  404: { bg: "#FFE4E6", fg: "#E11D48", text: "#881337" },
  500: { bg: "#FFE4E6", fg: "#E11D48", text: "#881337" },
  offline: { bg: "#E5E7EB", fg: "#6B7280", text: "#111827" },
};

const defaultPalette: Palette = { bg: "#E5E7EB", fg: "#6B7280", text: "#111827" };

// --- NUEVO: mapa de imágenes por código ---
const CODE_IMAGES: Record<string | number, { src: string; alt: string }> = {
  403: { src: Error403Img, alt: "Acceso denegado 403" },
  404: { src: Error404Img, alt: "Recurso no encontrado 404" },
  500: { src: Error500Img, alt: "Error interno del servidor 500" },
};

export default function ErrorPage({
  code,
  title,
  message,
  actions = [],
}: {
  code: string | number;
  title: string;
  message?: string;
  actions?: Action[];
}) {
  const palette = CODE_PALETTES[code] ?? defaultPalette;

  const img = CODE_IMAGES[code] ?? CODE_IMAGES[403];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-fit">
        <div className="grid md:grid-cols-[1.2fr,1fr] gap-6 p-6 md:p-10">
          <div className="flex flex-col justify-center">
            <div className="flex justify-center">
              <span
                className="inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: palette.bg, color: palette.text }}
                aria-hidden
              >
                {code !== "Offline" ? `Error ${code}` : "Offline"}
              </span>
            </div>

            <h1
              className="mt-4 text-2xl md:text-3xl font-semibold leading-tight"
              style={{ color: palette.text }}
            >
              {title}
            </h1>

            {message && <p className="mt-3 text-muted-foreground">{message}</p>}
          </div>

          {/* Imagen dinámica por código */}
          <div className="relative flex items-center justify-center">
            <img
              src={img.src}
              alt={img.alt}
              className="w-xl h-auto max-w-[520px] select-none"
              draggable={false}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {actions.length > 0 ? (
              actions.map((a, i) =>
                a.type === "link" ? (
                  <Button variant={"outline"} key={i} asChild>
                    <Link to={a.to}>{a.label}</Link>
                  </Button>
                ) : (
                  <Button key={i} onClick={() => window.location.reload()}>
                    {a.label}
                  </Button>
                )
              )
            ) : (
              <Button variant="secondary" onClick={() => history.back()}>
                Volver
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
