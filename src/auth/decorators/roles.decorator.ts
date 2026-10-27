import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../common/enums.js';

export const ROLES_KEY = 'roles';

// Marca un controlador o endpoint con los roles que pueden usarlo
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
