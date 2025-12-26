import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { MongoClient } from 'mongodb';

@Controller()
export class HealthController {
  constructor(@Inject('MONGO_CLIENT') private readonly mongoClient: MongoClient) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness() {
    try {
      const dbName = process.env.MONGODB_DB_NAME || 'silsilah';
      const res = await this.mongoClient.db(dbName).command({ ping: 1 });
      if ((res as any).ok === 1) {
        return { status: 'ready' };
      }
      throw new Error('Mongo ping failed');
    } catch (err) {
      throw new HttpException(
        { status: 'not-ready', reason: err instanceof Error ? err.message : 'unknown' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}