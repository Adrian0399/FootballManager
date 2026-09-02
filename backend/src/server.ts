import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/prisma/prisma.client.js';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  console.log('✅ Database connected');

  const app = buildApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Kaibil Backend running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
    console.log(`   CORS origin: ${env.CORS_ORIGIN}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => console.log('HTTP server closed.'));
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});