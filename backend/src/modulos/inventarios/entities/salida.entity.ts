import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Inventario } from "./inventario.entity";
import { Usuario } from "src/modulos/gestion-usuario/entities/usuario.entity";


@Entity()
export class Salida {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: 'timestamp'})
    fechaSalida: Date;

    @Column()
    cantidad: number;

    // NUEVAS (Tarea A.1.3, RF-IN-09). Ambas `nullable: true` a nivel de
    // esquema únicamente para no romper filas históricas — en el DTO de
    // creación (CrearSalidaDto) `fechaRegistro` es obligatoria. `usuarioResponsableId`
    // NUNCA se acepta desde el body/DTO: se debe poblar server-side desde
    // el usuario autenticado (request.user.id), con el mismo mecanismo ya
    // usado para Auditable.creadoPorId (ver src/common/auditoria/). Eso se
    // implementa en la tarea de servicio (A.1.7) — acá solo se modela la
    // columna.
    @Column({ name: 'usuario_responsable_id', type: 'int', nullable: true })
    usuarioResponsableId!: number | null;

    @ManyToOne(() => Usuario, { nullable: true })
    @JoinColumn({ name: 'usuario_responsable_id' })
    usuarioResponsable?: Usuario | null;

    @Column({ name: 'fecha_registro', type: 'datetime', nullable: true })
    fechaRegistro!: Date | null;

    @ManyToOne (() => Inventario, inventario => inventario.salidas)
    @JoinColumn({ name: 'inventario_id' })
    inventario: Inventario;

}