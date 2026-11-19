import { Estado_Factura } from 'src/common/enums/estadoFactura.enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, ManyToOne, Index} from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { SedeEnum } from 'src/common/enums/sede.enum';


@Entity()
export class Factura {

  @PrimaryGeneratedColumn()
  id_factura: number;

  // Índice simple (NO único, Tarea A.1.4): distintos proveedores pueden
  // coincidir en numeración, así que no es una restricción de unicidad,
  // solo acelera las búsquedas del listado por número de factura.
  @Index('idx_factura_numero')
  @Column({nullable: false})
  numero_factura: number;

  @Column({nullable: false})
  fecha_emitida: Date;

  // FECHA LÍMITE de pago: se trabaja a crédito (mensual, trimestral, etc.) y
  // esta es la fecha en la que se debe pagar. El nombre es histórico — no se
  // renombra para no romper la base, el API ni el frontend. Siempre tiene
  // valor, también mientras la factura está pendiente.
  @Column({nullable: false})
  fecha_pago: Date;

  // Fecha en que efectivamente se pagó. NULL mientras la factura esté
  // pendiente (y en facturas ya pagadas antes de existir esta columna: no se
  // inventa un valor histórico). Se completa al marcarla como pagada.
  @Column({ type: 'datetime', nullable: true, default: null })
  fecha_pagada: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  monto: number;
  
  @Column({type: 'enum', enum: Estado_Factura, default: Estado_Factura.pendiente})
  estado: Estado_Factura;

  // Decisión de negocio (fase CECUIDAM): default 'hogar' es seguro de aplicar
  // sin script de reclasificación previo, ya que hoy no existe otra sede.
  @Column({ type: 'enum', enum: SedeEnum, default: SedeEnum.HOGAR })
  sede: SedeEnum;

  @ManyToOne(() => Proveedor, proveedor => proveedor.facturas)
  proveedor: Proveedor;

}
