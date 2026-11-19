export type BadgeProps = {
    id: number;
    nombre: string;
    onClick: (id: number, nombre: string) => void;
}