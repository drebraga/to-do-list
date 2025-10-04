import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { AxiosResponse } from 'axios';

interface AiTaskSuggestionResponse {
  tasks: Array<{ title: string; isCompleted?: boolean }>;
}

@Injectable()
export class AiService {
  constructor(private readonly http: HttpService) {}

  async generateTasksWithOpenRouter(prompt: string, apiKey: string): Promise<AiTaskSuggestionResponse> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const body = {
      model: 'openrouter/auto',
      messages: [
        { role: 'system', content: 'Extract a short checklist of tasks as JSON.' },
        {
          role: 'user',
          content:
            'Given this goal, reply strictly as JSON like {"tasks":[{"title":"..."}]} with 3-7 tasks. Goal: ' +
            prompt,
        },
      ],
      response_format: { type: 'json_object' },
    };

    const response: AxiosResponse<{ choices?: Array<{ message?: { content?: string } }> }>= await firstValueFrom(
      this.http.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 25000,
      }),
    );
    const text = response.data?.choices?.[0]?.message?.content ?? '{}';
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.tasks)) {
        return { tasks: parsed.tasks } as AiTaskSuggestionResponse;
      }
      return { tasks: [] };
    } catch {
      return { tasks: [] };
    }
  }

  async generateTasksWithHuggingFace(prompt: string, apiKey: string): Promise<AiTaskSuggestionResponse> {
    const url = 'https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct';
    const input = `Extract a short checklist of tasks as JSON like {"tasks":[{"title":"..."}]}. Goal: ${prompt}`;
    const response: AxiosResponse<any> = await firstValueFrom(
      this.http.post(
        url,
        { inputs: input, parameters: { max_new_tokens: 256, return_full_text: false } },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      ),
    );
    const text: string = Array.isArray(response.data)
      ? (response.data?.[0]?.generated_text as string) ?? ''
      : (response.data?.generated_text as string) ?? '';

    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      const jsonSlice = start >= 0 && end >= 0 ? text.slice(start, end + 1) : '{}';
      const parsed = JSON.parse(jsonSlice);
      if (Array.isArray(parsed?.tasks)) {
        return { tasks: parsed.tasks } as AiTaskSuggestionResponse;
      }
      return { tasks: [] };
    } catch {
      return { tasks: [] };
    }
  }
}
