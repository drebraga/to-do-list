import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [HttpModule, TasksModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
