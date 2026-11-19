// gestionar solicitudes de voluntariado 

    // tabla y previews 
    export const rutaSolicitudesDonacionPreview = '/donacion/getPreviewSolicitudesDonacion';

    export const rutaRegistrosDonacionPreview = '/donacion/getPreviewRegistros';
    
    export const rutaEstadoSolicitudDonacion = '/donacion/getEstadoSolicitudDonacion';

    export const rutaSolicitudesDonacionPorId = '/donacion/getSolicitudById';

export const rutaRegistroDonacionPorId = '/donacion/getRegistroById';

export const rutaRegistroDonacionPorSolicitud = '/donacion/registrosBySolicitud';

    export const rutaFiltrarPorEstadoSolicitudDonacion = '/donacion/getFiltroSolicitudesDonacion';

    // acciones a solicitud
    export const rutaCambiarEstadoSolicitudDonacion = '/donacion/updateEstado';

    // acciones a registro
    export const rutaCambiarEstadoARecibido = '/donacion/updateEstadoARecibido';

    export const rutaCrearRegistroDonacion = '/donacion/crearRegistro';

    export const rutaEditarRegistroDonacion = '/donacion/updateRegistro';

    export const rutaReporteDonacionesPorMes = '/donacion/reportes/mensual/pdf';

    export const rutaFiltrarDonaciones = '/donacion/filtrar';