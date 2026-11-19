
import type { LucideIcon } from "lucide-react";

export interface SidebarChildItem {
  title: string;
  url: string;
  icon: LucideIcon;
  description: string;
  search?: Record<string, unknown>;
}

export interface modulesPreviewProps {
  previewModuleSubItems: SidebarChildItem[];
}