import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('[BOOTSTRAP] Creating Nest application...');
  const app = await NestFactory.create(AppModule);
  console.log('[BOOTSTRAP] Application created');
  
  // Enable CORS for local frontend dev server
  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin and localhost dev servers on any port (e.g., 5173-5180)
      const allowedPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
      if (!origin || allowedPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });
  
  console.log('[BOOTSTRAP] Starting listen on port 3000...');
  await app.listen(3000);
  console.log('[BOOTSTRAP] Application is listening on port 3000');
  
  // Graceful shutdown handlers
  process.on('SIGTERM', async () => {
    console.log('[BOOTSTRAP] SIGTERM received, closing application...');
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('[BOOTSTRAP] SIGINT received, closing application...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('[BOOTSTRAP] Error during bootstrap:', err);
  process.exit(1);
});
