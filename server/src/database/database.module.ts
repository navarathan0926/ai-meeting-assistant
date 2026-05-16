import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Meeting } from 'src/meetings/entities/meeting.entity';
import { Transcription } from 'src/transcriptions/entities/transcription.entity';
import { Summary } from 'src/summaries/entities/summary.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'meeting_assistant'),
        // autoLoadEntities: true,
        entities: [Meeting,Summary,Transcription],
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
