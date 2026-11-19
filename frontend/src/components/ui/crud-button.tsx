import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "node_modules/react-day-picker/dist/esm/components/custom-components";

type CrudKind = "create" | "read" | "update" | "delete";
type Emphasis = "solid" | "outline" | "ghost";
type CrudButtonProps = Omit<ButtonProps, "variant"> & {
  crud: CrudKind;
  emphasis?: Emphasis;
};

const palette: Record<CrudKind, { base: string; hover: string; ring: string; textOn?: "white" | "black" }> = {
  create: { base: "bg-[#84CC8E]", hover: "hover:bg-[#6EB878]", ring: "focus-visible:ring-[#84CC8E]", textOn: "white" },
  read:   { base: "bg-[#5595ED]", hover: "hover:bg-[#739DD9]", ring: "focus-visible:ring-[#8FB1E1]", textOn: "white" },
  update: { base: "bg-[#FFC53A]", hover: "hover:bg-[#D4AE56]", ring: "focus-visible:ring-[#E1C27A]", textOn: "black" },
  delete: { base: "bg-[#C95050]", hover: "hover:bg-[#CC5C5C]", ring: "focus-visible:ring-[#E17676]", textOn: "white" },
};

export function CrudButton({
  crud,
  emphasis = "solid",
  className,
  children,
  ...props
}: CrudButtonProps) {
  const c = palette[crud];

  const solid = cn(
    c.base,
    c.hover,
    c.textOn === "white" ? "text-white" : "text-zinc-900",
    "shadow-sm border border-transparent"
  );

  const outline = cn(
    "bg-transparent border",
    crud === "create" && "border-[#84CC8E] text-[#84CC8E] hover:bg-[#84CC8E]/10",
    crud === "read"   && "border-[#8FB1E1] text-[#8FB1E1] hover:bg-[#8FB1E1]/10",
    crud === "update" && "border-[#E1C27A] text-[#E1C27A] hover:bg-[#E1C27A]/10",
    crud === "delete" && "border-[#E17676] text-[#E17676] hover:bg-[#E17676]/10"
  );

  const ghost = cn(
    "bg-transparent border border-transparent",
    crud === "create" && "text-[#84CC8E] hover:bg-[#84CC8E]/10",
    crud === "read"   && "text-[#8FB1E1] hover:bg-[#8FB1E1]/10",
    crud === "update" && "text-[#E1C27A] hover:bg-[#E1C27A]/10",
    crud === "delete" && "text-[#E17676] hover:bg-[#E17676]/10"
  );

  const base =
    emphasis === "solid" ? solid :
    emphasis === "outline" ? outline :
    ghost;

  return (
    <Button
      className={cn(
        "rounded-2xl px-4 h-9 font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background",
        c.ring,
        base,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
