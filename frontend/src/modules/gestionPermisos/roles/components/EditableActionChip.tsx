function EditableActionChip({
  name,
  active,
  disabled,
  onToggle,
}: {
  name: string;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const norm = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const palette: Record<string, string> = {
    ver: "bg-blue-100 text-blue-700 border-blue-300",
    crear: "bg-green-100 text-green-700 border-green-300",
    actualizar: "bg-amber-100 text-amber-700 border-amber-300",
    eliminar: "bg-red-200 text-red-700 border-red-300",
  };
  const activeCls = palette[norm] ?? "bg-primary/10 text-primary border-primary/30";
  const base = "px-3 py-1.5 text-sm rounded-md border select-none";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={[
        base,
        "transition",
        active ? activeCls : "bg-muted text-muted-foreground border-muted",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:opacity-90",
      ].join(" ")}
    >
      {name}
    </button>
  );
}
export default EditableActionChip