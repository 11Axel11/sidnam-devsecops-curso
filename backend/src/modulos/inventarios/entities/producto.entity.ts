import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Inventario } from "./inventario.entity";
import { Subcategoria_Producto } from "./subCategoriaProducto.entity";
import { CategoriasPrincipalesProductos } from "src/common/enums/categoriasPrincipalesProductos.enum";


@Entity()
export class Producto {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column({ unique: true, nullable: false })
    codigo: string;

    /**
     * @deprecated Reemplazado por `Inventario.archivado` (Tarea A.1.2): el
     * archivado ahora es por sede (una fila de inventario puede archivarse
     * sin afectar la del producto en la otra sede), no por producto entero.
     * No se elimina en esta tarea ni cambia de tipo — se retira en una
     * limpieza técnica futura fuera de esta fase.
     */
    @Column({ default: false, nullable: true })
    archivado: boolean;

    @Column({ nullable: true })
    imagen_url?: string;

    @Column({ type: 'enum', enum: CategoriasPrincipalesProductos })
    categoriaTipo: CategoriasPrincipalesProductos;

    @ManyToOne(() => Subcategoria_Producto, s => s.productos, {
    nullable: true, onDelete: 'SET NULL'
    })
    @JoinColumn({ name: 'subcategoria_id' })
    subcategoria?: Subcategoria_Producto | null;

    @OneToMany(() => Inventario, inventario => inventario.producto)
    inventarios: Inventario[];
}