import { ErrorDetector } from './errorDetector.ts';
import { OllamaService } from '@/services/ollamaService.ts';
import type { DebugContext, DebugSession, ErrorAnalysis, Fix, FixType } from '@/types/index.ts';
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class DebugEngine {
  private errorDetector: ErrorDetector;
  private ollamaService: OllamaService;
  private sessions: Map<string, DebugSession> = new Map();

  constructor() {
    this.errorDetector = new ErrorDetector();
    this.ollamaService = new OllamaService();
  }

  async initialize(): Promise<void> {
    // Check if Ollama is available
    const available = await this.ollamaService.isAvailable();
    if (!available) {
      throw new Error('Ollama is not available. Please ensure Ollama is running.');
    }

    // Check for default model
    const hasDefault = await this.ollamaService.hasModel('llama3.2:latest');
    if (!hasDefault) {
      console.log('Default model not found. Pulling llama3.2:latest...');
      await this.ollamaService.pullModel('llama3.2:latest', (progress) => {
        process.stdout.write(`\rDownloading: ${progress.toFixed(2)}%`);
      });
      console.log('\nModel downloaded successfully!');
    }
  }

  async createSession(context: DebugContext): Promise<string> {
    const sessionId = randomBytes(8).toString('hex');
    const session: DebugSession = {
      id: sessionId,
      startTime: new Date(),
      context,
      applied: false
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  async analyzeError(sessionId: string): Promise<ErrorAnalysis | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // First, use pattern-based detection
    const analysis = await this.errorDetector.detect(session.context);
    
    if (!analysis) {
      return null;
    }

    // Enhance with AI analysis
    const aiAnalysis = await this.ollamaService.analyzeError(
      session.context.error || session.context.output,
      JSON.stringify({
        command: session.context.command,
        workingDirectory: session.context.workingDirectory
      })
    );

    // Parse AI response and enhance our analysis
    // For now, we'll add the AI suggestion to our analysis
    analysis.suggestion = aiAnalysis;
    
    session.analysis = analysis;
    return analysis;
  }

  async generateFixes(sessionId: string): Promise<Fix[]> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.analysis) {
      throw new Error('No analysis available for session');
    }

    const fixes: Fix[] = [];

    // Generate fixes based on error type
    switch (session.analysis.type) {
      case 'module':
        fixes.push(await this.createModuleInstallFix(session.analysis));
        break;
      case 'command':
        fixes.push(await this.createCommandFix(session.analysis));
        break;
      case 'permission':
        fixes.push(await this.createPermissionFix(session.analysis));
        break;
      default:
        // For other errors, use AI to suggest a fix
        const aiFix = await this.createAIFix(session);
        if (aiFix) fixes.push(aiFix);
    }

    session.fixes = fixes;
    return fixes;
  }

  private async createModuleInstallFix(analysis: ErrorAnalysis): Promise<Fix> {
    const moduleMatch = analysis.message.match(/Cannot find module '(.+)'|Module not found: (.+)/);
    const moduleName = moduleMatch?.[1] || moduleMatch?.[2] || 'unknown';
    
    return {
      type: 'install_package' as FixType,
      description: `Install missing module: ${moduleName}`,
      confidence: 0.9,
      apply: async () => {
        const packageManager = await this.detectPackageManager();
        const command = `${packageManager} add ${moduleName}`;
        await execAsync(command);
      }
    };
  }

  private async createCommandFix(analysis: ErrorAnalysis): Promise<Fix> {
    const commandMatch = analysis.message.match(/command not found: (.+)/);
    const command = commandMatch?.[1] || 'unknown';
    
    return {
      type: 'command' as FixType,
      description: `Install or add ${command} to PATH`,
      confidence: 0.8,
      apply: async () => {
        console.log(`Please install ${command} or ensure it's in your PATH`);
        // Could add platform-specific installation commands here
      }
    };
  }

  private async createPermissionFix(analysis: ErrorAnalysis): Promise<Fix> {
    return {
      type: 'permission_change' as FixType,
      description: 'Fix file permissions',
      confidence: 0.7,
      apply: async () => {
        if (analysis.file) {
          await execAsync(`chmod +x ${analysis.file}`);
        }
      }
    };
  }

  private async createAIFix(session: DebugSession): Promise<Fix | null> {
    const prompt = `
Given this error:
${session.context.error || session.context.output}

From command: ${session.context.command}
In directory: ${session.context.workingDirectory}

Provide a specific fix command that can be executed to resolve this issue.
Respond with ONLY the command, no explanation.`;

    const fixCommand = await this.ollamaService.generateResponse(prompt);
    
    if (!fixCommand || fixCommand.trim() === '') {
      return null;
    }

    return {
      type: 'command' as FixType,
      description: `Run suggested fix: ${fixCommand.trim()}`,
      confidence: 0.6,
      apply: async () => {
        await execAsync(fixCommand.trim(), {
          cwd: session.context.workingDirectory
        });
      }
    };
  }

  private async detectPackageManager(): Promise<string> {
    const managers = [
      { cmd: 'bun', file: 'bun.lockb' },
      { cmd: 'pnpm', file: 'pnpm-lock.yaml' },
      { cmd: 'yarn', file: 'yarn.lock' },
      { cmd: 'npm', file: 'package-lock.json' }
    ];

    for (const { cmd, file } of managers) {
      try {
        await fs.access(file);
        return cmd;
      } catch {
        // Continue to next
      }
    }

    // Default to npm if no lock file found
    return 'npm';
  }

  async applyFix(sessionId: string, fixIndex: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.fixes || !session.fixes[fixIndex]) {
      throw new Error('Fix not found');
    }

    const fix = session.fixes[fixIndex];
    await fix.apply();
    session.applied = true;
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }
}