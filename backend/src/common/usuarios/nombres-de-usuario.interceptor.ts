import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { mergeMap, Observable } from 'rxjs';
import { conNombresDeUsuario, esRespuestaDeDatos, recolectarIdsDeUsuario } from './nombres-de-usuario';
import { resolverUsuarios } from './resolver-usuarios';

/**
 * CA-26 (RF-TR-04): agrega a las respuestas del Bloque B el NOMBRE de quien registró, modificó o anuló cada registro, de
 * forma aditiva (`creadoPorNombre`, `modificadoPorNombre`, `anuladoPorNombre`, `usuarioResponsableNombre`,
 * `usuarioExaminadorNombre`, junto a su `…Id`).
 *
 * Un solo lugar para todos los controllers (los servicios no se tocan): después del handler junta TODOS los ids de la
 * respuesta y los resuelve con UNA consulta por petición (sin N+1, también en listados). Si no hay ids no consulta nada.
 *
 * Solo toca objetos o arreglos de datos: cualquier otra respuesta (string, `null`, `Buffer`, `StreamableFile`, streams
 * como un PDF…) pasa SIN TOCAR. Si la consulta de nombres fallara, la respuesta ya calculada NO se pierde (un POST ya se
 * guardó): se devuelve con los nombres en `null` y se deja un aviso en el log.
 */
@Injectable()
export class NombresDeUsuarioInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NombresDeUsuarioInterceptor.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(_contexto: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        if (!esRespuestaDeDatos(data)) return data;
        const ids = recolectarIdsDeUsuario(data);
        if (ids.size === 0) return data;
        let nombres: Map<number, string | null>;
        try {
          nombres = await resolverUsuarios(this.dataSource, ids);
        } catch (error) {
          this.logger.warn(`No se pudieron resolver los nombres de usuario: ${error instanceof Error ? error.message : String(error)}`);
          nombres = new Map();
        }
        return conNombresDeUsuario(data, nombres);
      }),
    );
  }
}
