import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import { DatabaseService } from '../../common/database.service.js';
import { appConfig } from '../../config.js';

@ApiTags('foundation')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('live')
  @ApiOkResponse({ description: 'Process liveness' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get()
  @ApiOkResponse({ description: 'Application liveness and dependency status' })
  async health() {
    const config = appConfig();
    const redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0 });
    const s3 = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    });
    const checks = await Promise.allSettled([
      this.db.$queryRaw`SELECT 1`,
      redis.connect().then(() => redis.ping()),
      s3.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET })),
    ]);
    redis.disconnect();
    s3.destroy();
    const dependencies = {
      postgres: checks[0]?.status === 'fulfilled' ? 'up' : 'down',
      redis: checks[1]?.status === 'fulfilled' ? 'up' : 'down',
      objectStorage: checks[2]?.status === 'fulfilled' ? 'up' : 'down',
    } as const;
    return {
      status: Object.values(dependencies).every((s) => s === 'up') ? 'ok' : 'degraded',
      dependencies,
      timestamp: new Date().toISOString(),
    };
  }
}
