import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { VALIDATION_PIPE_OPTIONS } from './shared/constants';
import { RequestIdMiddleware } from './shared/middlewares/request-id/request-id.middleware';
import {
  DEFAULT_TRUSTED_PROXY_HOPS,
  setTrustedProxyHops,
} from './shared/request-context/util/client-ip';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.use(RequestIdMiddleware);
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  const extraOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: ['http://localhost:5176', 'http://127.0.0.1:5176', ...extraOrigins],
    credentials: true,
  });

  const configService = app.get(ConfigService);

  // How many proxies append to X-Forwarded-For here. Set before the first
  // request so logs, audit and the throttle all resolve the same client.
  setTrustedProxyHops(
    configService.get<number>('throttle.trustedProxyHops') ??
      DEFAULT_TRUSTED_PROXY_HOPS,
  );

  // The schema maps every endpoint and payload, so it is developer surface
  // rather than product surface: served in development only (the tests run as
  // `test`, which is close enough), 404 everywhere else. `staging` is
  // deliberately excluded — it is a publicly reachable tester deployment, so
  // relabelling production as staging must not republish the schema. Caddy
  // keeps forwarding /api/v1/swagger* so flipping APP_ENV republishes without
  // an edge edit — in production the route simply 404s at the app.
  const env = configService.get<string>('env');
  if (env === 'development' || env === 'test') {
    const options = new DocumentBuilder()
      .setTitle('Arise KMS API')
      .setDescription('Arise KMS API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('swagger', app, document);
    console.log(`Swagger UI: http://localhost:${app.get(ConfigService).get('port')}/api/v1/swagger`);
  }

  const port = configService.get<number>('port') ?? 3006;
  await app.listen(port, '0.0.0.0');

  // ponytail: outlast axios's pooled sockets — 5s Node default closed idle keep-alive conns mid-reuse.
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}
void bootstrap();
