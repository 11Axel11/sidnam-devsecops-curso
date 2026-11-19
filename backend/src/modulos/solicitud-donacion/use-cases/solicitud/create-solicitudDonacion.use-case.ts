import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Solicitud_donacion_pendiente } from "../../entities/solicitudDonacionPendiente.entity";
import { SolicitudDonacionGateway } from "../../solicitudDonacion.gateway";
import { CrearSolicitudPendienteDto } from "../../dto/crearSolicitudPendienteDto";
import { SolicitudDonacionPendienteResponse } from "../../types/solicitud-donacion-response.type";
import { formatDateToCostaRica } from "src/common/utils/format-date-cr";
import { VoluntariadoGateway } from "src/modulos/voluntariado/voluntariado.gateway";

@Injectable()
export class CreateSolicitudDonacionUseCase {

    constructor(
    
        @InjectRepository(Solicitud_donacion_pendiente)
        private readonly solicitudPendiente: Repository<Solicitud_donacion_pendiente>,
        
    
        private readonly voluntariadoGateway: VoluntariadoGateway,
    
      ) {}

      async crearSolicitudDonacionPendiente(solicitud: CrearSolicitudPendienteDto): Promise<SolicitudDonacionPendienteResponse> {
      
               const crearSolicitud = this.solicitudPendiente.create({
                      cedula: solicitud.cedula,
                      nombre: solicitud.nombre,
                      apellido1: solicitud.apellido1,
                      apellido2: solicitud.apellido2,
                      telefono: solicitud.telefono,
                      email: solicitud.email,
                      anonimo: solicitud.anonimo,
                      descripcion: solicitud.descripcion,
                      tipoDonacion: solicitud.tipoDonacion,
                      observaciones: solicitud.observaciones,
      
               })
      
               const solicitudPendiente = await this.solicitudPendiente.save(crearSolicitud);
      
               this.emitSolicitudesPendientesCount(solicitudPendiente);
      
               return {
                 ...solicitudPendiente,
                 creadoEn: formatDateToCostaRica(solicitudPendiente.creadoEn),
               };
      }

      private async emitSolicitudesPendientesCount(solicitudPendiente: Solicitud_donacion_pendiente) {
            const total = await this.solicitudPendiente.count({
              where: { estado: 'pendiente' },
            });
      
            this.voluntariadoGateway.emitSolicitudesPendientesCount(
              total,
              {
                id: solicitudPendiente.id,
                nombre: solicitudPendiente.nombre,
                apellido1: solicitudPendiente.apellido1,
                apellido2: solicitudPendiente.apellido2,
                email: solicitudPendiente.email,
                tipo: 'donacion',
              },
            );
      }
}