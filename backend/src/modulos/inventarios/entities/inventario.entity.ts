import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Producto } from "./producto.entity";
import { Entrada } from "./entrada.entity";
import { Salida } from "./salida.entity";
import { Unidad_Medida } from "src/modulos/unidades-medida/entities/unidadMedida.entity";
import { SedeEnum } from "src/common/enums/sede.enum";

// Decisión de arquitectura ya cerrada (fase CECUIDAM): `sede` vive
// ÚNICAMENTE en `Inventario` y `Factura`, nunca en `Producto`. `Producto`
// es el catálogo compartido entre sedes; la existencia física y el
// archivado por sede se modelan acá.
//
// UNIQUE(producto, sede) aplicado (Bloque A.1, A.1.2) tras confirmar V2 de
// scripts/verificaciones-pre-cecuidam.sql en 0 filas contra dev
// (sidnamdb_dev, 2026-09-28) — ver docs/A.1-bloque-inventario-facturacion-cecuidam.md.
// Se referencia la relación `producto` (no `productoId`, que no existe como
// propiedad separada en esta entidad — el nombre real de columna es
// `producto_id` vía @JoinColumn).
@Entity()
@Unique('UQ_inventario_producto_sede', ['producto', 'sede'])
export class Inventario {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    stock: number;

    // Decisión de negocio (fase CECUIDAM): default 'hogar' es seguro de aplicar
    // sin script de reclasificación previo, ya que hoy no existe otra sede.
    @Column({ type: 'enum', enum: SedeEnum, default: SedeEnum.HOGAR })
    sede: SedeEnum;

    // NUEVO (Tarea A.1.2, RN-08): trasladado desde `Producto.archivado`
    // (ver @deprecated ahí). Archivar/desarchivar es por sede: esta columna
    // permite que una fila de inventario esté archivada sin afectar la del
    // mismo producto en la otra sede. La lógica de archivar/desarchivar en
    // sí (el servicio) se implementa en una tarea posterior — acá solo se
    // modela la columna y su default.
    @Column({ type: 'boolean', default: false })
    archivado: boolean;

    @ManyToOne(() => Producto, producto => producto.inventarios)
    @JoinColumn({ name: 'producto_id' })
    producto: Producto;

    @OneToMany(() => Entrada, entrada => entrada.inventario)
    entradas: Entrada[];

    @OneToMany(() => Salida, salida => salida.inventario)
    salidas: Salida[];

    @ManyToOne(() => Unidad_Medida, unidad_medida => unidad_medida.inventarios)
    @JoinColumn({ name: 'unidad_medida_id' })
    unidad_medida: Unidad_Medida;

}