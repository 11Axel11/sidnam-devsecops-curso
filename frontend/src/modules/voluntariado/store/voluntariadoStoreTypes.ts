export type SolicitudesVoluntariadoStore = {
  readIds: Set<number>;
  markAsRead: (id: number) => void;
  isRead: (id: number) => boolean;
};