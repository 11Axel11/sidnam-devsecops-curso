import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SolicitudPendienteNotificacion } from "../voluntariado/interfaces/SolicitudPendienteNotificacion";


@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class SolicitudDonacionGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  afterInit() {
    console.log("Gateway de donaciones inicializado");
  }

  emitSolicitudesPendientesCount(
    count: number,
    solicitudPendiente: SolicitudPendienteNotificacion,
  ) {
    const nombreCompleto = [
      solicitudPendiente.nombre,
      solicitudPendiente.apellido1,
      solicitudPendiente.apellido2,
    ]
      .filter(Boolean)
      .join(" ");

    const tipo = "donacion";

    this.server.emit("solicitudesPendientesCount", {
      totalPendientes: count,
      tipo,
      solicitud: {
        id: solicitudPendiente.id,
        nombre: nombreCompleto,
        email: solicitudPendiente.email,
        fecha: new Date().toISOString(),
        tipo,
      },
      mensaje: `${solicitudPendiente.nombre} envió una nueva solicitud de donación`,
    });
  }

  emitirNomasSolicitudesPendientes() {
    this.server.emit("nomasSolicitudesPendientes", {
      totalPendientes: 0,
      tipo: "donacion",
      mensaje: "No hay más solicitudes pendientes por revisar",
      fecha: new Date().toISOString(),
    });
  }
}