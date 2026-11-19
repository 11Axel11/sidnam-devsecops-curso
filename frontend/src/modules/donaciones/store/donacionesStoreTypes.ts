export type SolicitudesDonacionStore = {
    readIds: Set<number>;
    markAsRead: (id: number) => void;
    isRead: (id: number) => boolean;
};