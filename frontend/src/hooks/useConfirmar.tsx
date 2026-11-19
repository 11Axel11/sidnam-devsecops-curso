import { useConfirmModalStore } from "@/store/modalStore";

export const useConfirmacion = () => {
  const openModal = useConfirmModalStore((state) => state.openModal);

  return (message: React.ReactNode, variant: "destructive" | "approve" = "approve") =>
    new Promise<boolean>((resolve) => {
      openModal(
        message,
        () => resolve(true),
        () => resolve(false),
        variant
      );
    });
};
