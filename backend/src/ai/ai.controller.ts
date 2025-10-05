import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { TasksService } from '../tasks/tasks.service';
import type { GenerateBody } from './interfaces/interfaces';

@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly tasks: TasksService
  ) { }

  @Post('generate')
  async generate(@Body() { provider, apiKey, prompt }: GenerateBody) {
    return await this.ai.generateTasks(
      provider,
      apiKey,
      prompt,
      this.tasks
    );
  }
}