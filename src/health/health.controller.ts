import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  // GET /api/v1/health -> confirma que la API y la base de datos responden (RNF-11)
  @Get()
  @ApiOperation({ summary: 'Estado de la API y de la base de datos (monitoreo)' })
  async check() {
    try {
      const [row] = await this.dataSource.query<{ postgis: string }[]>(
        'SELECT PostGIS_Version() AS postgis',
      );
      return {
        status: 'ok',
        database: 'up',
        postgis: row.postgis,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
