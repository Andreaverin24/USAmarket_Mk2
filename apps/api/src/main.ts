import 'reflect-metadata';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createLogger } from '@atlas/observability';
import { AppModule } from './app.module.js';
import { appConfig } from './config.js';
import { apiSecurityHeaders } from './common/security-headers.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createApp() {
  const config = appConfig();
  const adapter = new FastifyAdapter({
    bodyLimit: 2_500_000,
    logger: false,
    trustProxy: config.TRUST_PROXY,
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn'],
  });
  await app.register(cookie);
  app.enableCors({
    origin: config.APP_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  });
  const instance = app.getHttpAdapter().getInstance();
  instance.addHook('onRequest', async (request: any) => {
    const requested = request.headers['x-correlation-id'];
    request.correlationId =
      typeof requested === 'string' && uuid.test(requested) ? requested : randomUUID();
  });
  instance.addHook('onSend', async (request: any, reply: any, payload: unknown) => {
    reply.header('x-correlation-id', request.correlationId);
    for (const [name, value] of Object.entries(
      apiSecurityHeaders(config.NODE_ENV === 'production'),
    ))
      reply.header(name, value);
    return payload;
  });
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Project Atlas Foundation API')
      .setVersion('0.1.0')
      .addCookieAuth(appConfig().SESSION_COOKIE_NAME)
      .build(),
  );
  instance.get('/openapi.json', async () => document);
  await app.init();
  return { app, document };
}

async function bootstrap() {
  const { app, document } = await createApp();
  const output = process.env.OPENAPI_OUTPUT;
  if (output) {
    const path = resolve(process.cwd(), output);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(document, null, 2));
    await app.close();
    return;
  }
  const config = appConfig();
  await app.listen(config.PORT, '0.0.0.0');
  createLogger('api').info({ port: config.PORT }, 'Atlas API started');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) void bootstrap();
