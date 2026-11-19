function ItemUsuario({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium sm:text-base">{label}</span>
      <span className="text-base text-muted-foreground sm:max-w-[60%] sm:text-right truncate">
        {value}
      </span>
    </div>
  )
}
export default ItemUsuario