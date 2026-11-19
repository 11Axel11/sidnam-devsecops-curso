import type { LucideIcon } from "lucide-react";

export interface SubCategoriaItem {
  title: string;
  url: string;
  icon: LucideIcon;
  search?: Record<string, unknown>;
}

export interface SubCategoriasProps {
  subCategoriasItems: SubCategoriaItem[];
}