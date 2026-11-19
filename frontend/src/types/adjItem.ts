import type { LucideIcon } from "lucide-react";
import type { FC } from "react";

export interface configCardProps {
    configName: string,
    configIcon: LucideIcon,
}
export interface configChildItem {
    title: string;
    dialogComponent?: FC;
    icon: LucideIcon;
    url: string;
}

export interface configPreviewProps {
    title: string,
    icon: LucideIcon,
    dialogComponent?: FC;
}

export type ConfigItem = {
    title: string;
    icon: LucideIcon;
    dialogComponent?: React.FC;
    url?: string;
    perms?: string[];
    anyOf?: string[];
};

export type ConfigSection = {
    title: string;
    description?: string;
    perms?: string[]; 
    anyOf?: string[]; 
    items: ConfigItem[];
};
