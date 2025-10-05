export interface AiTaskSuggestionResponse {
  tasks: Array<{ title: string; isCompleted?: boolean }>;
}

export interface GenerateTasksResult {
  created: number;
  tasks: Array<{ id: string; title: string; isCompleted: boolean; createdAt: Date }>;
}

export interface GenerateBody {
  provider: 'openrouter' | 'huggingface';
  apiKey: string;
  prompt: string;
}
