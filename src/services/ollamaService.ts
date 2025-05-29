import { Ollama } from 'ollama';
import type { ModelConfig } from '@/types/index.ts';

export class OllamaService {
  private ollama: Ollama;
  private defaultModel = 'llama3.2:latest';

  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      return response.models.map(model => model.name);
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    const stream = await this.ollama.pull({
      model: modelName,
      stream: true
    });

    for await (const part of stream) {
      if (part.total && part.completed && onProgress) {
        const progress = (part.completed / part.total) * 100;
        onProgress(progress);
      }
    }
  }

  async generateResponse(
    prompt: string,
    config?: ModelConfig
  ): Promise<string> {
    const modelName = config?.name || this.defaultModel;
    
    // Ensure model is available
    if (!await this.hasModel(modelName)) {
      throw new Error(`Model ${modelName} not found. Please pull it first.`);
    }

    const response = await this.ollama.generate({
      model: modelName,
      prompt,
      system: config?.systemPrompt,
      options: {
        temperature: config?.temperature ?? 0.7,
        num_predict: config?.maxTokens ?? 2048,
      }
    });

    return response.response;
  }

  async streamResponse(
    prompt: string,
    config?: ModelConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const modelName = config?.name || this.defaultModel;
    
    if (!await this.hasModel(modelName)) {
      throw new Error(`Model ${modelName} not found. Please pull it first.`);
    }

    const stream = await this.ollama.generate({
      model: modelName,
      prompt,
      system: config?.systemPrompt,
      stream: true,
      options: {
        temperature: config?.temperature ?? 0.7,
        num_predict: config?.maxTokens ?? 2048,
      }
    });

    let fullResponse = '';
    for await (const part of stream) {
      if (part.response) {
        fullResponse += part.response;
        onChunk?.(part.response);
      }
    }

    return fullResponse;
  }

  async analyzeError(
    error: string,
    context: string,
    modelConfig?: ModelConfig
  ): Promise<string> {
    const prompt = `
You are a debugging assistant. Analyze the following error and provide a concise explanation and solution.

Error:
${error}

Context:
${context}

Provide:
1. A brief explanation of what went wrong
2. The most likely fix
3. Any additional steps if needed

Keep your response concise and actionable.`;

    return this.generateResponse(prompt, {
      name: modelConfig?.name || this.defaultModel,
      temperature: modelConfig?.temperature,
      maxTokens: modelConfig?.maxTokens,
      systemPrompt: modelConfig?.systemPrompt || 'You are a helpful debugging assistant that provides clear, actionable solutions to programming errors.'
    });
  }
}