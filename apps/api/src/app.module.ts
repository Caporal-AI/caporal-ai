import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalProfilesModule } from './animal-profiles/animal-profiles.module';
import { AnimalProfile } from './animal-profiles/animal-profile.entity';
import { AssistantModule } from './assistant/assistant.module';
import { AssistantMessage } from './assistant/assistant-message.entity';
import { AssistantSession } from './assistant/assistant-session.entity';
import { AssistantToolCall } from './assistant/assistant-tool-call.entity';
import { RagInteraction } from './assistant/rag-interaction.entity';
import { RagDocument } from './assistant/rag-document.entity';
import { BatchHealthEvent } from './batches/batch-health-event.entity';
import { BatchProjection } from './batches/batch-projection.entity';
import { BatchWeighIn } from './batches/batch-weigh-in.entity';
import { Batch } from './batches/batch.entity';
import { BatchesModule } from './batches/batches.module';
import { DietRun } from './diets/diet-run.entity';
import { DietsModule } from './diets/diets.module';
import { Ingredient } from './ingredients/ingredient.entity';
import { IngredientPrice } from './ingredients/ingredient-price.entity';
import { HealthModule } from './health/health.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { MetricsModule } from './metrics/metrics.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER', 'caporal'),
        password: configService.get<string>('DB_PASSWORD', 'caporal'),
        database: configService.get<string>('DB_NAME', 'caporal'),
        entities: [
          Ingredient,
          IngredientPrice,
          AnimalProfile,
          Batch,
          BatchWeighIn,
          BatchHealthEvent,
          BatchProjection,
          DietRun,
          AssistantSession,
          AssistantMessage,
          AssistantToolCall,
          RagInteraction,
          RagDocument,
        ],
        synchronize: false,
      }),
    }),
    HealthModule,
    IngredientsModule,
    AnimalProfilesModule,
    DietsModule,
    BatchesModule,
    AssistantModule,
    MetricsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
