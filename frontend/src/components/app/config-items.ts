import FormAgregarMedicamentos from "@/modules/residentes/components/enfermeria/FormAgregarMedicamentos";
import FormAgregarPatologia from "@/modules/residentes/components/enfermeria/FormAgregarPatologia";
import FormAgregarTipoConsulta from "@/modules/residentes/components/enfermeria/FormAgregarTipoConsulta";
import { Activity, LayoutDashboard, ListChecks, Ruler, Stethoscope, HeartHandshake } from "lucide-react";
import FormAgregarUnidadMedida from "./FormAgregarUnidadMedida";
import type { ConfigSection } from "@/types/adjItem";
import FormAgregarSubCategoria from "@/modules/inventarios/components/FormAgregarSubCategoria";
import FormAgregarTipoVoluntariado from "@/modules/voluntariado/components/FormAgregarTipoVoluntariado";
import FormAgregarEDUS from "@/modules/residentes/components/enfermeria/FormAgregarEDUS";
import DialogManualesUsuario from "./DialogManualesUsuario";
import { PERM } from "@/lib/permisosClinicos";

export const ConfigSections: ConfigSection[] = [

    {
        title: "Ayuda",
        anyOf: [
            "Donaciones.Solicitud Donaciones:Ver",
            "Donaciones.Gestion Donaciones:Ver",
            "Donaciones.Gestión Donaciones:Ver",
            "Inventariado.Alimentos:Ver",
            "Inventariado.Limpieza:Ver",
            "Inventariado.Medicamentos:Ver",
            "Inventariado.Salidas:Ver",
            "Residencia.General Expedientes:Ver",
            "Residencia.Enfermeria:Ver",
            "Residencia.Enfermería:Ver",
            "Residencia.Trabajo Social:Ver",
            "Voluntariado.Solicitudes Voluntariado:Ver",
            "Voluntariado.Gestion Voluntariado:Ver",
            "Voluntariado.Gestión Voluntariado:Ver",
        ],
        items: [
            {
                title: "Manuales de usuario",
                icon: LayoutDashboard,
                dialogComponent: DialogManualesUsuario,
                anyOf: [
                    "Donaciones.Solicitud Donaciones:Ver",
                    "Donaciones.Gestion Donaciones:Ver",
                    "Donaciones.Gestión Donaciones:Ver",
                    "Inventariado.Alimentos:Ver",
                    "Inventariado.Limpieza:Ver",
                    "Inventariado.Medicamentos:Ver",
                    "Inventariado.Salidas:Ver",
                    "Residencia.General Expedientes:Ver",
                    "Residencia.Enfermeria:Ver",
                    "Residencia.Enfermería:Ver",
                    "Residencia.Trabajo Social:Ver",
                    "Voluntariado.Solicitudes Voluntariado:Ver",
                    "Voluntariado.Gestion Voluntariado:Ver",
                    "Voluntariado.Gestión Voluntariado:Ver",
                ],
            },
        ],
    },
    {
        title: "Enfermería",
        anyOf: ["Residencia.Enfermería:Ver"],
        items: [
            {
                title: "Agregar patologías",
                icon: Activity,
                dialogComponent: FormAgregarPatologia,
                anyOf: [
                    "Residencia.Enfermería:Crear",
                    "Residencia.Enfermería:Actualizar"
                ],
            },
            {
                title: "Agregar tipos de consultas de Especialista",
                icon: Activity,
                dialogComponent: FormAgregarTipoConsulta,
                anyOf: [
                    "Residencia.Enfermería:Crear",
                    "Residencia.Enfermería:Actualizar"
                ],
            },
            {
                title: "Agregar medicamento",
                icon: Ruler,
                dialogComponent: FormAgregarMedicamentos,
                anyOf: [
                    "Residencia.Enfermería:Crear",
                    "Residencia.Enfermería:Actualizar"
                ],
            },
            {
                title: "Agregar unidad de medida",
                icon: Ruler,
                dialogComponent: FormAgregarUnidadMedida,
                anyOf: [
                    "Residencia.Enfermería:Crear",
                    "Residencia.Enfermería:Actualizar"
                ],
            },
            {
                title: "Crear contraseña de EDUS",
                icon: Stethoscope,
                dialogComponent: FormAgregarEDUS,
                anyOf: [
                    "Residencia.Enfermería:Crear",
                ],
            },
        ],
    },
    {
        title: "Nutrición y Terapia Física",
        perms: [PERM.catalogos.ver],
        items: [
            {
                title: "Administrar catálogos",
                icon: ListChecks,
                url: "/ajustes/catalogos",
            },
        ],
    },
    {
        title: "Inventarios",
        anyOf: [
            "Inventariado.Alimentos:Ver",
            "Inventariado.Limpieza:Ver",
            "Inventariado.Medicamentos:Ver",
        ],
        items: [
            {
                title: "Agregar unidad de medida",
                icon: Ruler,
                dialogComponent: FormAgregarUnidadMedida,
                anyOf: [
                    "Inventariado.Alimentos:Crear",
                    "Inventariado.Alimentos:Actualizar",
                    "Inventariado.Limpieza:Crear",
                    "Inventariado.Limpieza:Actualizar",
                    "Inventariado.Medicamentos:Crear",
                    "Inventariado.Medicamentos:Actualizar",
                ],
            },
            {
                title: "Agregar Sub Categoría de alimento",
                icon: LayoutDashboard,
                dialogComponent: FormAgregarSubCategoria,
                anyOf: [
                    "Inventariado.Alimentos:Crear",
                    "Inventariado.Alimentos:Actualizar",
                    "Inventariado.Limpieza:Crear",
                    "Inventariado.Limpieza:Actualizar",
                    "Inventariado.Medicamentos:Crear",
                    "Inventariado.Medicamentos:Actualizar",
                ],
            },
        ],
    },
    {
        title: "Voluntariado",
        anyOf: [
            'Voluntariado.Gestion Voluntariado:Actualizar',
            'Voluntariado.Gestion Voluntariado:Crear',
        ],
        items: [
            {
                title: "Agregar tipo de voluntariado",
                icon: HeartHandshake,
                dialogComponent: FormAgregarTipoVoluntariado,
                anyOf: [
                    'Voluntariado.Gestion Voluntariado:Actualizar',
                    'Voluntariado.Gestion Voluntariado:Crear',
                ],
            },
        ],
    }
];