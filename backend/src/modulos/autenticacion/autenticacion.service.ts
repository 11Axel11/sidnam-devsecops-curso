import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GestionUsuarioService } from '../gestion-usuario/services/gestion-usuario.service';
import { RegisterDto } from './dto/registerDto';
import * as bcryptjs from 'bcryptjs';
import { LoginDto } from './dto/loginDto';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email/email.service';
import { Repository } from 'typeorm';
import { Usuario } from '../gestion-usuario/entities/usuario.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { RolUsuario } from '../gestion-usuario/entities/rol.entity';
import { RolPermisoAccion } from '../gestion-usuario/entities/rolPermisoAccion.entity';
import { Estado_Usuario } from 'src/common/enums/esatadoUsuario.enum';

// bcrypt solo compara los primeros 72 bytes y todos los JWT de un mismo
// usuario comparten ese prefijo, por eso se usa SHA-256.
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AutenticacionService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    private readonly gestionUsuarios: GestionUsuarioService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,

    @InjectRepository(RolUsuario)
    private readonly rolRepository: Repository<RolUsuario>,

    @InjectRepository(RolPermisoAccion)
    private readonly rpaRepo: Repository<RolPermisoAccion>,
  ) {}

  async crearUsuario({
    cedula,
    email,
    name,
    password,
    idRol,
    apellido1,
    apellido2,
  }: RegisterDto) {
    const rol = await this.rolRepository.findOneBy({ id_rol: idRol });
    if (!rol) {
      throw new BadRequestException('Rol inválido');
    }

    const usuario = await this.gestionUsuarios.findOneByCedula(cedula);
    const correo = await this.gestionUsuarios.findOneByEmail(email);

    if (usuario?.estado == Estado_Usuario.activo && correo) {
      throw new BadRequestException('Correo en uso');
    }

    if (usuario?.estado == Estado_Usuario.activo && usuario) {
      throw new BadRequestException('La cedula ya se encuentra registrada');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    await this.gestionUsuarios.createUsuario({
      cedula,
      email,
      name,
      password: hashedPassword,
      rol,
      apellido1,
      apellido2,
    });

    return {
      message: 'Usuario creado con exito',
    };
  }

  async login({ cedula, password }: LoginDto) {
    const user = await this.gestionUsuarios.findOneByCedula(cedula);
    if (!user) throw new UnauthorizedException('Cédula inválida');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Contraseña inválida');

    if (user.estado == Estado_Usuario.inactivo) {
      throw new ForbiddenException(
        'Error a la hora de iniciar sesion, consulta el error',
      );
    }

    const { accessToken, refreshToken } = await this.issueTokens(user);

    return { accessToken, refreshToken, id: user.id };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.gestionUsuarios
      .findOneById(payload.id)
      .catch(() => null);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (!user.refreshToken) {
      throw new UnauthorizedException('Refresh token no almacenado');
    }

    if (hashRefreshToken(refreshToken) !== user.refreshToken) {
      throw new UnauthorizedException('Refresh token no coincide');
    }

    const tokens = await this.issueTokens(user);

    return { ...tokens, id: user.id };
  }

  // Emite un par nuevo y guarda el hash del refresh token (rotación).
  private async issueTokens(user: Usuario) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.rol.nombre,
      name: user.name,
      roleId: user.rol.id_rol,
    };

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' },
      { expiresIn: '15m' },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      { expiresIn: '7d' },
    );

    user.refreshToken = hashRefreshToken(refreshToken);
    await this.gestionUsuarios.saveUsuario(user);

    return { accessToken, refreshToken };
  }

  async verifyToken(token: string) {
    return this.jwtService.verifyAsync(token);
  }

  async logout(userId: number) {
    await this.usuarios.update(userId, { refreshToken: null });
    return { message: 'Sesión cerrada' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.gestionUsuarios.findOneByEmail(email);

    if (user?.email?.trim()) {
      await this.emailService.sendResetPasswordLink(user.email.trim());
    }

    return {
      message:
        'Si este correo está vinculado a una cuenta, podrás restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const email = await this.emailService.decodeConfirmationToken(token);

    const user = await this.gestionUsuarios.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException(`No user found for email: ${email}`);
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    await this.gestionUsuarios.updateUsuario(email, hashedPassword);
  }

  async getUserWithPermissions(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    const usuario = await this.usuarios.findOne({
      where: { id: payload.id },
      relations: ['rol'],
    });

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const rpas = await this.rpaRepo.find({
      where: { rol: { id_rol: payload.roleId } },
      relations: ['permiso', 'accion'],
    });

    const permissions = rpas.map((rpa) => {
      const modulo = rpa.permiso.modulo;
      const seccion = rpa.permiso.seccion ? `.${rpa.permiso.seccion}` : '';
      return `${modulo}${seccion}:${rpa.accion.accion}`;
    });

    return {
      user: {
        id: usuario.id,
        cedula: usuario.cedula,
        name: usuario.name,
        email: usuario.email,
        roles: [usuario.rol.nombre],
      },
      permissions,
      version: 8,
      issuedAt: new Date().toISOString(),
    };
  }
}