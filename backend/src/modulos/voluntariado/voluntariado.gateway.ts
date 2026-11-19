import { WebSocketGateway, WebSocketServer, OnGatewayInit } from "@nestjs/websockets";
import {Server} from 'socket.io'
import { Repository } from "typeorm";
import { SolicitudPendiente } from "./entities/solicitudPendiente.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { SolicitudPendienteNotificacion } from "./interfaces/SolicitudPendienteNotificacion";
import { DataSource } from 'typeorm';
import { allowedOrigins } from '../../config/security';
import { configureSocketSecurity } from '../../config/socket-adapter';

@WebSocketGateway({
    cors: {
        origin: allowedOrigins(),
        credentials: true,
    },
    allowRequest: (req, callback) => callback(null, !!req.headers.origin && allowedOrigins().includes(req.headers.origin)),
})

export class VoluntariadoGateway implements OnGatewayInit{
    constructor(private readonly source: DataSource) {}

    @WebSocketServer()
    server!: Server;

    afterInit(server: Server){
        configureSocketSecurity(server, this.source);
    }

    emitSolicitudesPendientesCount(count: number, solicitudPendiente: SolicitudPendienteNotificacion,) {

        const nombreCompleto = [
            solicitudPendiente.nombre,
            solicitudPendiente.apellido1,
            solicitudPendiente.apellido2,
        ]
            .filter(Boolean)
            .join(' ');

        const tipo = solicitudPendiente.tipo ?? 'voluntariado';

        this.server.emit('solicitudesPendientesCount', {
            totalPendientes: count,
            tipo,
            solicitud: {
            id: solicitudPendiente.id,
            nombre: nombreCompleto,
            email: solicitudPendiente.email,
            fecha: new Date().toISOString(),
            tipo,
            },
            mensaje:
            tipo === 'donacion'
                ? `${solicitudPendiente.nombre} envió una nueva solicitud de donación`
                : `${solicitudPendiente.nombre} envió una nueva solicitud de voluntariado`,
        });
        }
        
   emitirNomasSolicitudesPendientes(tipo?: 'voluntariado' | 'donacion') {
        this.server.emit('nomasSolicitudesPendientes', {
            totalPendientes: 0,
            tipo: tipo ?? 'voluntariado',
            mensaje: 'No hay más solicitudes pendientes por revisar',
            fecha: new Date().toISOString(),
        });
    }
}
