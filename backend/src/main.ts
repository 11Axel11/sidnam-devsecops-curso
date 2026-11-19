import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import basicAuth = require('express-basic-auth');
import { allowedOrigins, validateEnvironment } from './config/security';

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule);

  const server = app.getHttpAdapter().getInstance();
  server.disable('x-powered-by');
  server.set('trust proxy', 'loopback');

  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed: (string | RegExp)[] = allowedOrigins();

      const ok = allowed.some((o) =>
        o instanceof RegExp ? o.test(origin) : o === origin,
      );

      return ok
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      if ((origin && !allowedOrigins().includes(origin)) || (!origin && req.headers.cookie)) return res.status(403).json({ message: 'Untrusted origin' });
      if (process.env.EXTERNAL_SERVICES === 'disabled' && !/^\/api\/(autenticacion\/(login|refresh|logout)$|catalogos\/)/.test(req.path)) return res.status(403).json({ message: 'Operation unavailable in isolated staging' });
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // TODOS los endpoints reales quedan bajo /api
  app.setGlobalPrefix('api');

  // Password Swagger
  const swaggerPassword =
    process.env.SWAGGER_PASSWORD!;

  // Protege Swagger
  app.use(
    ['/docs', '/docs-json'],
    basicAuth({
      challenge: true,
      users: {
        admin: swaggerPassword,
      },
    }),
  );

  // Config Swagger
 const isProd = process.env.NODE_ENV === 'production';

const apiUrl = isProd
  ? process.env.APP_ORIGIN!
  : `http://localhost:${process.env.PORT ?? 3000}`;

const config = new DocumentBuilder()
  .setTitle('API SIDNAM')
  .setDescription(
    'Documentación de la API del sistema de voluntariado',
  )
  .setVersion('1.0')
  .addServer(apiUrl)
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);

  // Swagger en /docs
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `🚀 Servidor corriendo en http://localhost:${process.env.PORT ?? 3000}`,
  );

  console.log(
    `📚 Swagger disponible en http://localhost:${process.env.PORT ?? 3000}/docs`,
  );
}

bootstrap();
