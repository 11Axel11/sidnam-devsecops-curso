import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Expediente_Residente } from './expedientes.entity';

@Entity()
export class SalidaResidente {
  @PrimaryGeneratedColumn()
  id_salida: number;

  @Column()
  parentesco: string;

  @Column()
  nombre_familiar: string;

  @Column()
  apellido1_familiar: string;

  @Column()
  apellido2_familiar: string;

  @Column({ type: 'date' })
  fecha_salida: Date;

  @Column({ type: 'time' })
  hora_salida: string;

  @Column({ type: 'date' })
  fecha_regreso: Date;

  @Column({ type: 'time' })
  hora_regreso: string;

  @ManyToOne(() => Expediente_Residente, expediente => expediente.salidas, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_expediente' })
  expediente: Expediente_Residente;
}