import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "hover:cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          " bg-amaranthPink text-primary-foreground shadow-xs hover:bg-amaranthPinkDark/90",
        create:
          "bg-create text-white shadow-xs hover:bg-create/90 focus-visible:ring-create/20 dark:focus-visible:ring-create/40 dark:bg-create/60",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        update:
          "bg-update text-white shadow-xs hover:bg-update/90 focus-visible:ring-update/20 disabled:bg-updateDisabled dark:focus-visible:ring-update/40 dark:bg-update/60",
        read:
          "bg-read text-white shadow-xs hover:bg-read/90 focus-visible:ring-read/20 dark:focus-visible:ring-read/40 dark:bg-read/60",
          approve:
          "bg-approve text-white shadow-xs hover:bg-approveHover focus-visible:ring-approve/20 dark:focus-visible:ring-approve/40 dark:bg-approve/60",
        deny:
          "bg-deny text-white shadow-xs hover:bg-denyHover focus-visible:ring-deny/20 dark:focus-visible:ring-deny/40 dark:bg-deny/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/90 hover:shadow-sm transition-colors duration-200 border border-transparent hover:border-secondary-foreground/20",
        action:
          "bg-ecruYellow-600 text-secondary-foreground shadow-xs hover:bg-ecruYellow/80",
        received:
          "bg-received text-white shadow-xs hover:bg-receivedHover",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
