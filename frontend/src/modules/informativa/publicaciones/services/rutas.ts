//endpoints a publicaciones

    //gets
    
        export const rutaGetDonaciones = '/publicaciones/getDonaciones'
        export const rutaGetDonacionById = '/publicaciones/getDonacion'
        export const rutaGetProyectos = '/publicaciones/getProyectos'
        export const rutaGetProyectoById = '/publicaciones/getProyecto'
        export const rutaGetEventos = '/publicaciones/getEventos'
        export const rutaGetEventoById = '/publicaciones/getEvento'
        export const rutaGetDonacionesArchivadas = '/publicaciones/getDonacionesInactivas'
        export const rutaGetProyectosArchivados = '/publicaciones/getProyectosInactivos'
        export const rutaGetEventosArchivados = '/publicaciones/getEventosInactivos'
    
    //posts
        export const rutaPostDonacion = '/publicaciones/createDonacion'
        export const rutaPostProyecto = '/publicaciones/createProyecto'
        export const rutaPostEvento = '/publicaciones/createEvento'
    
    //patches
        export const rutaPatchDonacion = '/publicaciones/updateDonacion'
        export const rutaPatchProyecto = '/publicaciones/updateProyecto'
        export const rutaPatchEvento = '/publicaciones/updateEvento'
        export const rutaPatchHandleDonacion = '/publicaciones/handleDonacion'
        export const rutaPatchHandleProyecto = '/publicaciones/handleProyecto'
        export const rutaPatchHandleEvento = '/publicaciones/handleEvento'