import { Module } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { GestionUsuarioModule } from '../gestion-usuario/gestion-usuario.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/common/constants/jwt.constant';
import { EmailService } from './email/email.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../gestion-usuario/entities/usuario.entity';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';

@Module({
  imports: [
    ConfigModule,
    GestionUsuarioModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: jwtConstants.secret, signOptions: { expiresIn: '15m' } }),
    }),
    TypeOrmModule.forFeature([Usuario, RolUsuario, RolPermisoAccion])
  ],
  providers: [AutenticacionService, EmailService],
  controllers: [AutenticacionController],
  exports: [EmailService]
})
export class AutenticacionModule {}
