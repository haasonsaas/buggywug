export interface DebugContext {
  command: string;
  output: string;
  error: string;
  workingDirectory: string;
  timestamp: Date;
}

export interface ErrorAnalysis {
  type: ErrorType;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
  confidence: number;
}

export enum ErrorType {
  SYNTAX = 'syntax',
  RUNTIME = 'runtime',
  TYPE = 'type',
  COMMAND = 'command',
  MODULE = 'module',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface Fix {
  type: FixType;
  description: string;
  confidence: number;
  apply: () => Promise<void>;
}

export enum FixType {
  COMMAND = 'command',
  FILE_EDIT = 'file_edit',
  INSTALL_PACKAGE = 'install_package',
  PERMISSION_CHANGE = 'permission_change',
  CONFIG_UPDATE = 'config_update'
}

export interface ModelConfig {
  name?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface DebugSession {
  id: string;
  startTime: Date;
  context: DebugContext;
  analysis?: ErrorAnalysis;
  fixes?: Fix[];
  applied?: boolean;
}