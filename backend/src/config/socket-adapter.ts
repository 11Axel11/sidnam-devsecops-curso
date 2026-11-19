import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { ACCESS_TOKEN_COOKIE } from '../modulos/autenticacion/auth-cookies';
import { RolPermisoAccion } from '../modulos/gestion-usuario/entities/rolPermisoAccion.entity';

export function configureSocketSecurity(server: any, source: DataSource) {
    server.use(async (socket, next) => {
      try {
        const cookies = Object.fromEntries((socket.handshake.headers.cookie ?? '').split(';').map((part: string) => { const index = part.indexOf('='); return [part.slice(0, index).trim(), part.slice(index + 1)]; }));
        const payload = await new JwtService().verifyAsync(cookies[ACCESS_TOKEN_COOKIE], { secret: process.env.JWT_SECRET });
        if (payload.type !== 'access') throw new Error();
        // This gateway broadcasts donor and volunteer notifications to every connected client.
        // Require both permissions until notifications are separated into authorized rooms.
        const repo = source.getRepository(RolPermisoAccion);
        for (const section of ['Solicitudes Voluntariado', 'Solicitud Donaciones']) {
          const access = await repo.findOne({ where: { rol: { id_rol: payload.roleId }, permiso: { seccion: section }, accion: { accion: 'Ver' } } });
          if (!access) throw new Error();
        }
        next();
      } catch { next(new Error('Unauthorized')); }
    });
}
