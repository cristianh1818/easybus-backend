import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcryptjs';
import { Usuario } from './entities/usuario.entity.js';
import { Rol } from '../common/enums.js';

// Costo de bcrypt: cuántas veces se repite el cálculo del hash (más = más lento de romper)
const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsuariosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  // Se ejecuta una vez al arrancar la API: crea el administrador inicial si no existe
  async onApplicationBootstrap() {
    const correo = this.config.get<string>('ADMIN_CORREO');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!correo || !password) return;

    const existe = await this.repo.existsBy({ correo: correo.toLowerCase() });
    if (existe) return;

    await this.crear({
      nombre: this.config.get<string>('ADMIN_NOMBRE', 'Administrador'),
      correo,
      password,
      rol: Rol.ADMINISTRADOR,
    });
    this.logger.log(`Administrador inicial creado: ${correo}`);
  }

  async crear(datos: {
    nombre: string;
    correo: string;
    password: string;
    rol?: Rol;
  }): Promise<Usuario> {
    const correo = datos.correo.toLowerCase().trim();
    if (await this.repo.existsBy({ correo })) {
      throw new ConflictException({ code: 'CORREO_REGISTRADO', message: 'Ya existe una cuenta con ese correo' });
    }

    const usuario = this.repo.create({
      nombre: datos.nombre.trim(),
      correo,
      contrasenaHash: await hash(datos.password, BCRYPT_ROUNDS),
      rol: datos.rol ?? Rol.PASAJERO,
    });
    const guardado = await this.repo.save(usuario);
    return this.buscarPorId(guardado.id) as Promise<Usuario>;
  }

  // Incluye el hash de la contraseña: solo para validar el login
  buscarPorCorreoConHash(correo: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.contrasenaHash')
      .where('u.correo = :correo', { correo: correo.toLowerCase().trim() })
      .getOne();
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOneBy({ id });
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ order: { creadoEn: 'ASC' } });
  }
}
