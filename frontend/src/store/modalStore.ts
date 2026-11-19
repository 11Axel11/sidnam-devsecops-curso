import { create } from "zustand";
import type { ConfirmModalState } from "./modalStoreTypes";

export const useConfirmModalStore = create<ConfirmModalState>((set) => ({
  isOpen: false,
  message: "",
  variant: "approve",
  onConfirm: undefined,
  onCancel: undefined,
  openModal: (message, onConfirm, onCancel, variant = "approve") =>
    set({ isOpen: true, message, onConfirm, onCancel, variant }),
  closeModal: () => set({ isOpen: false, message: "", onConfirm: undefined, onCancel: undefined }),
}));