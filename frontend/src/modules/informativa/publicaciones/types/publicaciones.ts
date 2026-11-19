import type { Publicacion, CreatePublicacion, UpdatePublicacion } from "../models/publicaciones";

export type PreviewPublicacionProps = {
    publicacion: Publicacion,
    link: string
};

export type PublicacionProps = {
    publicacion: Publicacion,
    onArchive?: (id:number) => Promise<void>,
    archiving?: boolean,
    link: string,
    tipo: 'solicitud de donación' | 'proyecto' | 'evento',
    onUpdate?: (id: number, changedValues: UpdatePublicacion) => Promise<void>,
    updating?: boolean
};

export type FormAgregarPublicacionProps = {
    tipo: 'solicitud de donación' | 'proyecto' | 'evento',
    onSubmit?: (publicacion: CreatePublicacion) => void | Promise<void>
};

export type FormEditarPublicacionProps = {
    tipo: 'solicitud de donación' | 'proyecto' | 'evento',
    publicacion: Publicacion,
    onSubmit?: (id: number, changedValues: UpdatePublicacion) => Promise<void>,
    updating?: boolean  
};