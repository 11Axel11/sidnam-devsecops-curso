import FormEditarExpedienteResidenteGeneral from '@/modules/residentes/components/FormEditarExpedienteResidenteGeneral'
import { useGetExpedienteResidente } from '@/modules/residentes/hooks/expedientesHooks'
import type { ExpedienteResidente } from '@/modules/residentes/models/expedienteResidente'
import type { EditarExpedienteResidenteFormData } from '@/modules/residentes/types/expedienteResidenteProps'
import { ensurePerms, makeCan } from '@/services/authHelpers'
import { createFileRoute, redirect, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/residentes/$id/editar')({
    component: RouteComponent,
    beforeLoad: async ({ context, location }) => {
        const perms = await ensurePerms(context.queryClient)
        const { canAny } = makeCan(perms)
        const ok = canAny([
            'Residencia.General Expedientes:Actualizar',
        ])
        if (!ok) throw redirect({ to: '/403', search: { from: location.href } })
    },
})

function adaptExpedienteResidenteToEditarForm(
    expediente: ExpedienteResidente,
): EditarExpedienteResidenteFormData {
    const residente = expediente.residente
    const normalizeEstadoCivilValue = (
        value: unknown,
    ): EditarExpedienteResidenteFormData['estado_civil'] => {
        if (value === undefined) return undefined
        if (value === null) return null
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
            const parsed = Number(value)
            return Number.isNaN(parsed) ? null : parsed
        }
        if (typeof value === 'object') {
            const objectValue = value as Record<string, unknown>
            const rawId =
                objectValue.id ?? objectValue.id_estado_civil ?? objectValue.estado_civil

            if (typeof rawId === 'number') return rawId
            if (typeof rawId === 'string') {
                const parsed = Number(rawId)
                return Number.isNaN(parsed) ? null : parsed
            }
        }
        return null
    }

    const sexo =
        residente?.sexo === 'F' || residente?.sexo === 'M'
            ? residente.sexo
            : residente?.sexo?.toLowerCase().startsWith('f')
                ? 'F'
                : residente?.sexo?.toLowerCase().startsWith('m')
                    ? 'M'
                    : ''

    return {
        tipo_pension: expediente.tipo_pension,
        fecha_ingreso: expediente.fecha_ingreso ?? '',
        cedula: residente?.cedula ?? '',
        nombre: residente?.nombre ?? '',
        apellido1: residente?.apellido1 ?? '',
        apellido2: residente?.apellido2 ?? '',
        sexo,
        edad: residente?.edad != null ? String(residente.edad) : '',
        correo: residente?.email ?? '',
        estado_civil: normalizeEstadoCivilValue(residente?.estado_civil),
        dependencia: residente?.dependencia,
        lineaPobreza: residente?.linea_pobreza,
        fecha_nacimiento: residente?.fecha_nacimiento ?? '',
        encargados: (residente?.encargados ?? []).map((encargado) => ({
            id: encargado.id,
            cedula: encargado.cedula != null ? String(encargado.cedula) : undefined,
            nombre: encargado.nombre ?? '',
            apellido1: encargado.apellido1 ?? '',
            apellido2: encargado.apellido2 ?? '',
            correo: encargado.correo ?? '',
            telefono: encargado.telefono ?? '',
        })),
    }
}

function RouteComponent() {
    const { id } = useParams({ from: '/residentes/$id/editar' })
    const { expedienteResidente } = useGetExpedienteResidente(id)

    if (!expedienteResidente) {
        return <div>no encontrado</div>
    }

    const expedienteEditable = adaptExpedienteResidenteToEditarForm(expedienteResidente)

    return (
        <div>
            <FormEditarExpedienteResidenteGeneral expediente={expedienteEditable} />
        </div>
    )
}
