import { Injectable, BadRequestException, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';
import { TasksService } from 'src/tasks/tasks.service';
import { Task } from 'src/tasks/task.entity';
import { AiTaskSuggestionResponse, GenerateTasksResult } from './interfaces/interfaces';

@Injectable()
export class AiService {
  constructor(private readonly http: HttpService) { }

  private validateInput(apiKey: string, prompt: string): void {
    if (!apiKey?.trim()) {
      throw new BadRequestException('API key is required');
    }
    if (!prompt?.trim()) {
      throw new BadRequestException('Prompt is required');
    }
  }

  private readonly logger = new Logger(AiService.name);

  private handleApiError(error: any, provider: string): never {
    this.logger.error(
      `Error while calling ${provider}: ${error.message}`,
      error.stack,
    );

    if (error.response) {
      const status = error.response.status;
      const data = typeof error.response.data === 'object'
        ? JSON.stringify(error.response.data, null, 2)
        : String(error.response.data || '');

      this.logger.debug(`Response from ${provider}: ${status} - ${data}`);

      if (status === 401) {
        throw new UnauthorizedException(`Invalid API key for ${provider}`);
      }
      if (status === 429) {
        throw new BadRequestException(`Rate limit exceeded for ${provider}`);
      }
      if (status === 408 || error.code === 'ECONNABORTED') {
        throw new BadRequestException(`Request timeout for ${provider}`);
      }

      throw new InternalServerErrorException(
        `API error from ${provider} (status ${status})`,
      );
    }

    if (error.request) {
      this.logger.warn(`No response received from ${provider}`);
      throw new InternalServerErrorException(
        `No response from ${provider} - possibly a timeout.`,
      );
    }

    throw new InternalServerErrorException(
      `Unexpected error when calling ${provider}: ${error.message}`,
    );
  }


  private parseAiResponse(text: string): AiTaskSuggestionResponse {
    if (!text?.trim()) {
      throw new Error('Empty response from AI service');
    }

    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      const jsonSlice = start >= 0 && end >= 0 ? text.slice(start, end + 1) : text;

      const parsed = JSON.parse(jsonSlice);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON response');
      }

      if (Array.isArray(parsed?.tasks)) {
        const validTasks = parsed.tasks
          .filter((task: any) => task && typeof task === 'object')
          .map((task: any) => ({
            title: String(task.title || '').trim(),
            isCompleted: Boolean(task.isCompleted)
          }))
          .filter(task => task.title.length > 0);

        return { tasks: validTasks };
      }

      return { tasks: [] };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  async generateTasksWithOpenRouter(prompt: string, apiKey: string): Promise<AiTaskSuggestionResponse> {
    this.validateInput(apiKey, prompt);

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts tasks from goals. Always respond with valid JSON format.'
        },
        {
          role: 'user',
          content: `Given this goal, reply strictly as JSON like {"tasks":[{"title":"task title","isCompleted":false}]} with 3-7 tasks. Goal: ${prompt}`,
        },
      ],
      response_format: { type: 'json_object' },
    };

    try {
      const response: AxiosResponse<{ choices?: Array<{ message?: { content?: string } }> }> = await firstValueFrom(
        this.http.post(url, body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 25000,
        }),
      );

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('No content in AI response');
      }

      return this.parseAiResponse(response.data.choices[0].message.content);
    } catch (error) {
      this.handleApiError(error, 'OpenRouter');
    }
  }

  async generateTasksWithHuggingFace(prompt: string, apiKey: string): Promise<AiTaskSuggestionResponse> {
    this.validateInput(apiKey, prompt);

    const url = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct';
    const input = `Extract a short checklist of tasks as JSON like {"tasks":[{"title":"task title","isCompleted":false}]}. Goal: ${prompt}`;

    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.http.post(
          url,
          {
            inputs: input,
            parameters: {
              max_new_tokens: 256,
              return_full_text: false
            }
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 25000,
          },
        ),
      );

      let text = '';
      if (Array.isArray(response.data)) {
        text = response.data?.[0]?.generated_text || '';
      } else {
        text = response.data?.generated_text || '';
      }

      if (!text) {
        throw new Error('No generated text in response');
      }

      return this.parseAiResponse(text);
    } catch (error) {
      this.handleApiError(error, 'HuggingFace');
    }
  }

  async generateTasks(
    provider: 'openrouter' | 'huggingface',
    apiKey: string,
    prompt: string,
    tasksService: TasksService
  ): Promise<GenerateTasksResult> {
    const result = provider === 'huggingface'
      ? await this.generateTasksWithHuggingFace(prompt, apiKey)
      : await this.generateTasksWithOpenRouter(prompt, apiKey);

    const created: Task[] = [];
    for (const task of result.tasks) {
      try {
        const saved = await tasksService.create({
          title: task.title,
          isCompleted: task.isCompleted || false
        });
        created.push(saved);
      } catch (error) {
        console.error(`Failed to save task: ${task.title}`, error);
      }
    }

    return {
      created: created.length,
      tasks: created
    };
  }
}