import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { TasksService } from '../tasks/tasks.service';

interface GenerateBody {
  provider: 'openrouter' | 'huggingface';
  apiKey: string;
  prompt: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService, private readonly tasks: TasksService) {}

  @Post('generate')
  async generate(@Body() body: GenerateBody) {
    const { provider, apiKey, prompt } = body;
    if (!apiKey || !prompt) {
      return { created: 0, tasks: [] };
    }

    const result =
      provider === 'huggingface'
        ? await this.ai.generateTasksWithHuggingFace(prompt, apiKey)
        : await this.ai.generateTasksWithOpenRouter(prompt, apiKey);

    const created: Array<{ id: string; title: string; isCompleted: boolean; createdAt: Date }>= [];
    for (const t of result.tasks) {
      const title = String(t.title ?? '').trim();
      if (!title) continue;
      const saved = await this.tasks.create({ title, isCompleted: Boolean(t.isCompleted) });
      created.push(saved);
    }

    return { created: created.length, tasks: created };
  }
}
