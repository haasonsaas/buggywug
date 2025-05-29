import { spawn } from 'child_process';
import type { DebugContext } from '@/types/index.ts';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export async function executeCommand(
  command: string,
  cwd?: string
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    
    // Parse command and arguments
    const [cmd, ...args] = command.split(' ');
    
    const proc = spawn(cmd, args, {
      cwd: cwd || process.cwd(),
      shell: true,
      env: process.env
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code || 0,
        duration
      });
    });

    proc.on('error', (error) => {
      stderr += error.message;
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 1,
        duration: Date.now() - startTime
      });
    });
  });
}

export async function captureLastCommand(): Promise<string | null> {
  // Try to get the last command from shell history
  // This is a simplified version - in practice, you'd need shell-specific logic
  try {
    const result = await executeCommand('fc -ln -1');
    if (result.exitCode === 0 && result.stdout) {
      return result.stdout.trim();
    }
  } catch {
    // Fallback methods could go here
  }
  
  return null;
}

export function createDebugContext(
  command: string,
  result: ExecutionResult
): DebugContext {
  return {
    command,
    output: result.stdout,
    error: result.stderr,
    workingDirectory: process.cwd(),
    timestamp: new Date()
  };
}