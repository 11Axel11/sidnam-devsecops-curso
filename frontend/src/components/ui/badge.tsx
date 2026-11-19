import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        pending:
          "bg-[var(--badge-yellowPlain)] text-[var(--badge-yellow)] border-[var(--badge-yellowAccent)] hover:bg-[var(--badge-yellowAccent)]",
        
        accepted:
          "bg-[var(--badge-greenPlain)] text-[var(--badge-green)] border-[var(--badge-greenAccent)] hover:bg-[var(--badge-greenAccent)]",
        
        denied:
          "bg-[var(--badge-redPlain)] text-[var(--badge-red)] border-[var(--badge-redAccent)] hover:bg-[var(--badge-redAccent)]",

        processed:
          "bg-[var(--badge-orangePlain)] text-[var(--badge-orange)] border-[var(--badge-orangeAccent)] hover:bg-[var(--badge-orangeAccent)]",
        
        received:
          "bg-[var(--badge-bluePlain)] text-[var(--badge-blue)] border-[var(--badge-blueAccent)] hover:bg-[var(--badge-blueAccent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
