import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Textarea> & {
  /** Muestra el número de caracteres (y el máximo, solo si se pasa `maxLength`). */
  mostrarContador?: boolean;
};

// `field-sizing: content` hace crecer el textarea sin JavaScript (Chromium). Donde no exista
// (p. ej. Firefox) se ajusta la altura a mano con scrollHeight.
const soportaFieldSizing =
  typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content");

export default function TextareaAutoexpandible({
  mostrarContador,
  className,
  value,
  defaultValue,
  onChange,
  ...props
}: Props) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const [largo, setLargo] = React.useState(String(value ?? defaultValue ?? "").length);

  const ajustarAltura = React.useCallback(() => {
    const el = ref.current;
    if (!el || soportaFieldSizing) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    if (value !== undefined) setLargo(String(value).length);
    ajustarAltura();
  }, [value, ajustarAltura]);

  return (
    <div className="w-full">
      <Textarea
        {...props}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn(!soportaFieldSizing && "resize-none overflow-hidden", className)}
        onChange={(e) => {
          setLargo(e.target.value.length);
          ajustarAltura();
          onChange?.(e);
        }}
      />
      {mostrarContador && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {props.maxLength ? `${largo}/${props.maxLength}` : largo}
        </p>
      )}
    </div>
  );
}
