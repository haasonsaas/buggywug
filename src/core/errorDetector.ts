import { DebugContext, ErrorAnalysis, ErrorType } from '@/types/index.ts';

export class ErrorDetector {
  private patterns = {
    syntax: [
      /SyntaxError: (.+)/,
      /ParseError: (.+)/,
      /Unexpected token (.+)/,
      /Unterminated (.+)/
    ],
    type: [
      /TypeError: (.+)/,
      /Type '(.+)' is not assignable to type '(.+)'/,
      /Property '(.+)' does not exist on type '(.+)'/
    ],
    module: [
      /Cannot find module '(.+)'/,
      /Module not found: (.+)/,
      /Failed to resolve import "(.+)"/,
      /No module named '(.+)'/
    ],
    runtime: [
      /ReferenceError: (.+)/,
      /RangeError: (.+)/,
      /Maximum call stack size exceeded/
    ],
    permission: [
      /Permission denied/,
      /EACCES: permission denied/,
      /Operation not permitted/
    ],
    command: [
      /command not found: (.+)/,
      /bash: (.+): command not found/,
      /zsh: command not found: (.+)/
    ]
  };

  async detect(context: DebugContext): Promise<ErrorAnalysis | null> {
    const errorText = context.error || context.output;
    
    if (!errorText) {
      return null;
    }

    for (const [type, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = errorText.match(pattern);
        if (match) {
          return this.createAnalysis(
            type as ErrorType,
            match[0],
            errorText,
            match[1]
          );
        }
      }
    }

    // If no specific pattern matches, return unknown error
    return {
      type: ErrorType.UNKNOWN,
      message: errorText.split('\n')[0],
      confidence: 0.5
    };
  }

  private createAnalysis(
    type: ErrorType,
    message: string,
    fullError: string,
    detail?: string
  ): ErrorAnalysis {
    const analysis: ErrorAnalysis = {
      type,
      message,
      confidence: 0.8
    };

    // Extract file and line information if present
    const fileMatch = fullError.match(/(?:at |in |from )(?:.*\()?([^():]+):(\d+)/);
    if (fileMatch) {
      analysis.file = fileMatch[1];
      analysis.line = parseInt(fileMatch[2], 10);
    }

    // Add type-specific suggestions
    switch (type) {
      case ErrorType.MODULE:
        analysis.suggestion = `Install missing module: ${detail}`;
        break;
      case ErrorType.COMMAND:
        analysis.suggestion = `Command not found: ${detail}. Check if it's installed or in PATH.`;
        break;
      case ErrorType.PERMISSION:
        analysis.suggestion = 'Try running with elevated permissions or check file ownership.';
        break;
    }

    return analysis;
  }

  extractTraceback(error: string): string[] {
    const lines = error.split('\n');
    const traceback: string[] = [];
    let inTraceback = false;

    for (const line of lines) {
      if (line.includes('at ') || line.includes('File ')) {
        inTraceback = true;
      }
      
      if (inTraceback) {
        traceback.push(line.trim());
      }
    }

    return traceback;
  }
}