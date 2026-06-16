import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { StellarTomlController } from './stellar-toml.controller';
import { HealthService } from './health.service';
import { SupabaseService } from '../../database/supabase.client';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'blockchain-indexer' },
      { name: 'payment-reminders' },
      { name: 'transaction-status-checker' },
      { name: 'nonce-cleanup' },
    ),
  ],
  controllers: [HealthController, StellarTomlController],
  providers: [HealthService, SupabaseService],
})
export class HealthModule {}
