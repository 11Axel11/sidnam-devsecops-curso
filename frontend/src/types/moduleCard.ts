import type { LucideIcon } from "lucide-react";

export interface ModuleCardProps {
  moduleName: string,
  moduleDescription: string,
  moduleIcon: LucideIcon,
  action: () => void;
}