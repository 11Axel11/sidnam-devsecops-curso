import { sidebarItems } from "@/components/app/sidebar-items"

export function buildPathNameMap() {
  const map: Record<string, string> = {}

  for (const item of sidebarItems) {
    if (item.url) {
      map[item.url.toLowerCase()] = item.title
    }

    if (item.children) {
      for (const child of item.children) {
        const fullPath = child.url ? child.url.toLowerCase() : ""
        const isGestion = child.title.toLowerCase().includes("gestion")
        const isSolicitud = child.title.toLowerCase().includes("solicitudes")
        const isCrear = child.title.toLowerCase().includes("crear")

        if (isGestion) {
          map[fullPath] = `Gestionar ${item.title.toLowerCase()}`
        } else if (isSolicitud) {
          map[fullPath] = `Solicitudes de ${item.title.toLowerCase()}`
        } else if (isCrear) {
          map[fullPath] = `Crear Expediente`
        } else {
          map[fullPath] = child.title
        }
      }
    }
  }

  const extraRoutes: Record<string, string> = {
    "/voluntarios/gestion/crear": "Crear expediente",
    "/residentes/crear": "Crear expediente",
    "/usuarios/gestion/crearusuario": "Crear usuario",
    "/voluntarios/solicitudes": "Solicitudes de voluntarios",
  }

  return { ...map, ...extraRoutes }
}
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}