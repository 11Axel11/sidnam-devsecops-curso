import {
  BookMarked,
  Cuboid,
  FolderHeart,
  HandHeart,
  HeartHandshake,
  Home,
  Images,
  Inbox,
  LayoutTemplate,
  Megaphone,
  MonitorCog,
  Package2,
  Settings,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
export type SidebarItem = {
  title: string;
  icon: LucideIcon;
  url?: string;
  showCount?: boolean;
  badgeKey?: string;
  description?: string;

  perms?: string[];
  anyOf?: string[];

  children?: SidebarItem[];
};
export const sidebarItems: SidebarItem[] = [
  {
    title: "Inicio",
    url: "/",
    icon: Home,
    showCount: false,
    description: "Bienvenido al sistema SIDNAM",
  },
  // DONACIONES
  {
    title: "Donaciones",
    icon: HandHeart,
    anyOf: [
      "Donaciones.Solicitud Donaciones:Ver",
      "Donaciones.Gestión Donaciones:Ver",
    ],
    children: [
      {
        title: "Solicitudes",
        url: "/donaciones/solicitudes",
        icon: Inbox,
        showCount: true,
        badgeKey: "donaciones",
        description: "Gestiona las solicitudes de donaciones.",
        perms: ["Donaciones.Solicitud Donaciones:Ver"],
      },
      {
        title: "Gestión",
        url: "/donaciones/gestion",
        icon: MonitorCog,
        showCount: false,
        description: "Gestiona el historial de donaciones.",
        perms: ["Donaciones.Gestión Donaciones:Ver"],
      },
    ],
  },
  // INFORMATIVA 
  {
    title: "Informativa",
    icon: LayoutTemplate,
    url: "/informativa",
    anyOf: [
      "Donaciones.Solicitud Donaciones:Crear",
      "Donaciones.Solicitud Donaciones:Actualizar",
      "Donaciones.Solicitud Donaciones:Eliminar",

      "Informativa.Eventos:Ver",
      "Informativa.Galeria:Ver",
      "Informativa.Proyectos:Ver",
    ],
    showCount: false,
    description: "Gestiona el contenido informativo.",
    children: [
      {
        title: "Publicaciones",
        url: "/informativa/publicaciones",
        icon: Megaphone,
        showCount: false,
        description: "Crea nuevas publicaciones.",
        anyOf: [
          "Donaciones.Solicitud Donaciones:Crear",
          "Donaciones.Solicitud Donaciones:Actualizar",
          "Donaciones.Solicitud Donaciones:Eliminar",
          "Informativa.Eventos:Ver",
          "Informativa.Galeria:Ver",
          "Informativa.Proyectos:Ver",
        ],
      },
      {
        title: "Galería",
        url: "/informativa/galeria",
        icon: Images,
        showCount: false,
        description: "Administra imágenes y categorías.",
        perms: ["Informativa.Galeria:Ver"],
      },
    ],
  },
  // INVENTARIOS
  {
    title: "Inventarios",
    icon: BookMarked,
    url: "/inventarios",
    anyOf: [
      "Inventariado.Alimentos:Ver",
      "Inventariado.Limpieza:Ver",
      "Inventariado.Medicamentos:Ver",
    ],
    showCount: false,
    description: "Control de inventarios por categoría.",
  },
  {
    title: "Salidas de despensa",
    icon: Cuboid,
    url: "/salidas",
    anyOf: [
      "Inventariado.Salidas:Ver",
    ],
    showCount: false,
    description: "Gestiona la salida de despensa.",
  },
  // PROVEEDURÍA 
  {
    title: "Proveeduría",
    icon: Package2,
    url: "/proveeduria",
    perms: ["Proveduría.General Proveduría:Ver"],
    showCount: false,
    description: "Gestión general de proveeduría.",
  },
  // FACTURAS 
  {
    title: "Facturas",
    icon: TicketPercent,
    url: "/facturacion/",
    perms: ["Proveduría.Facturas Proveduría:Ver"],
    showCount: false,
    description: "Facturas de proveeduría.",
  },
  // RESIDENTES
  {
    title: "Residentes",
    icon: FolderHeart,
    url: "/residentes",
    anyOf: [
      "Residencia.General Expedientes:Ver",
      "Residencia.Enfermería:Ver",
      "Residencia.Trabajo Social:Ver",
    ],
    showCount: false,
    description: "Explora y gestiona expedientes de residentes.",
  },

  // VOLUNTARIOS
  {
    title: "Voluntarios",
    icon: HeartHandshake,
    anyOf: [
      "Voluntariado.Solicitudes Voluntariado:Ver",
      "Voluntariado.Gestión Voluntariado:Ver",
    ],
    children: [
      {
        title: "Solicitudes",
        url: "/voluntarios/solicitudes",
        icon: Inbox,
        showCount: true,
        badgeKey: "voluntariado",
        description: "Gestiona las solicitudes de voluntariado.",
        perms: ["Voluntariado.Solicitudes Voluntariado:Ver"],
      },
      {
        title: "Gestión",
        url: "/voluntarios/gestion",
        icon: MonitorCog,
        showCount: false,
        description: "Gestiona expedientes de voluntariado.",
        perms: ["Voluntariado.Gestión Voluntariado:Ver"],
      },
    ],
  },
  {
    title: "Ajustes",
    icon: Settings,
    url: "/ajustes",
    showCount: false,
        description: "Gestiona los expedientes de los voluntarios en el sistema.",
  },
];
