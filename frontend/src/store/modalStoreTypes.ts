export type ConfirmModalState = {
  isOpen: boolean;
  message: React.ReactNode | string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant: "destructive" | "approve";
  openModal: (
    message: React.ReactNode | string,
    onConfirm?: () => void,
    onCancel?: () => void,
    variant?: "destructive" | "approve" 
  ) => void;
  closeModal: () => void;
};