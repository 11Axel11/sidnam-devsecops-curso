import type { LucideIcon } from "lucide-react";

export interface SubCategorieCardProps {
  subCategorieName: string,
  subCategorieIcon: LucideIcon,
  action: () => void;
}