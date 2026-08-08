import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

// Comma-separated, so each environment declares its own origins. Never reflect
// the request origin back: paired with credentials: true that would let any
// site on the internet make authenticated requests as a logged-in user.
function corsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS;
  if (configured) {
    return configured
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  return ['http://localhost:3000', 'http://localhost:3001'];
}

async function bootstrap() {
  // bufferLogs so startup lines also go through pino once it is resolved.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.enableCors({ origin: corsOrigins(), credentials: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 4000);
}
void bootstrap();
