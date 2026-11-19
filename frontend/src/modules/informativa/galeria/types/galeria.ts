import type { ReactNode } from "react";
import type { Galeria } from "../models/galeria";

export interface BotonGaleriaProps {
  children: ReactNode;
  isActive: boolean
  toggleCategoria: () => void;
}
export interface CardGaleriaProps {
  imagenes: Galeria,
  toggleModal: (imagen: Galeria) => void;
}
export interface ModalImagenGaleriaProps {
  imagen: { imagenUrl: string; descripcion?: string } | null;
  open: boolean;
  onClose: () => void;
};

export interface FormEditarCategoriaProps {
  id: number;
}

export interface FormEditarImagenProps {
  id: number;
  categoriaId: number;
}
