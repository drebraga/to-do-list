"use client";
import CustomCheckbox from "@/components/checkbox";
import TrashIcon from "@/components/trashIcon";
import { useEffect, useMemo, useState } from "react";

type Task = { id: string; title: string; isCompleted: boolean; createdAt: string };

export default function Home() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000", []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<"openrouter" | "huggingface">("openrouter");
  const [aiKey, setAiKey] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadTasks() {
    const res = await fetch(`${apiBase}/tasks`);
    const data = await res.json();
    setTasks(data);
  }

  useEffect(() => {
    loadTasks();
  }, [apiBase]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch(`${apiBase}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const task = await res.json();
    setTasks((t) => [task, ...t]);
    setTitle("");
  }

  async function toggleTask(task: Task) {
    const res = await fetch(`${apiBase}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title, isCompleted: !task.isCompleted }),
    });
    const updated = await res.json();
    setTasks((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function deleteTask(id: string) {
    await fetch(`${apiBase}/tasks/${id}`, { method: "DELETE" });
    setTasks((list) => list.filter((t) => t.id !== id));
  }

  async function generateTasksFromAI(e: React.FormEvent) {
    e.preventDefault();
    if (!aiKey || !aiPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiProvider, apiKey: aiKey, prompt: aiPrompt }),
      });
      const data = await res.json();
      if (Array.isArray(data?.tasks)) {
        setTasks((prev) => [...data.tasks, ...prev]);
      }
      setAiPrompt("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 transition-colors duration-200">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">To-do-List</h1>

        <form onSubmit={createTask} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 border border-gray-600 rounded px-3 py-2
                       bg-gray-800 text-gray-100 placeholder-gray-400"
            placeholder="Título da nova tarefa"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
            Adicionar
          </button>
        </form>

        <div className="space-y-2">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border border-gray-700 rounded px-3 py-2
                         bg-gray-800 hover:bg-gray-700/80 transition-colors"
            >
              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                <CustomCheckbox
                  checked={t.isCompleted}
                  onChange={() => toggleTask(t)}
                />
                <span className={t.isCompleted ? "line-through text-gray-400" : ""}>
                  {t.title}
                </span>
              </label>
              <button
                onClick={() => deleteTask(t.id)}
                className="p-1 hover:bg-red-900/20 rounded transition-colors"
                title="Excluir tarefa"
              >
                <TrashIcon className="text-red-500 hover:text-red-400 transition-colors" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={generateTasksFromAI} className="space-y-3 border border-gray-700 rounded p-4
                                                        bg-gray-800 transition-colors">
          <h2 className="font-semibold text-lg">Gerar tarefas com IA</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as "openrouter" | "huggingface")}
              className="border border-gray-600 rounded px-2 py-2 bg-gray-800 text-gray-100"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="huggingface">Hugging Face</option>
            </select>
            <input
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              className="border border-gray-600 rounded px-2 py-2 bg-gray-800 text-gray-100 placeholder-gray-400"
              placeholder="Chave da API"
              type="password"
            />
            <button
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded transition-colors"
            >
              {loading ? "Gerando..." : "Gerar"}
            </button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-gray-800 text-gray-100 placeholder-gray-400 transition-colors"
            placeholder="Descreva seu objetivo; a IA irá propor tarefas"
            rows={3}
          />
        </form>
      </div>
    </div>
  );
}
