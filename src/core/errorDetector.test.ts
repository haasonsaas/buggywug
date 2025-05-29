import { describe, test, expect } from 'bun:test';
import { ErrorDetector } from './errorDetector';
import { ErrorType } from '@/types';

describe('ErrorDetector', () => {
  const detector = new ErrorDetector();

  test('detects syntax errors', async () => {
    const context = {
      command: 'node test.js',
      output: '',
      error: 'SyntaxError: Unexpected token }',
      workingDirectory: '/test',
      timestamp: new Date()
    };

    const analysis = await detector.detect(context);
    expect(analysis).toBeTruthy();
    expect(analysis?.type).toBe(ErrorType.SYNTAX);
    expect(analysis?.message).toContain('SyntaxError');
  });

  test('detects module not found errors', async () => {
    const context = {
      command: 'node app.js',
      output: '',
      error: "Error: Cannot find module 'express'",
      workingDirectory: '/test',
      timestamp: new Date()
    };

    const analysis = await detector.detect(context);
    expect(analysis).toBeTruthy();
    expect(analysis?.type).toBe(ErrorType.MODULE);
    expect(analysis?.suggestion).toContain('Install missing module: express');
  });

  test('detects command not found errors', async () => {
    const context = {
      command: 'gitx status',
      output: '',
      error: 'zsh: command not found: gitx',
      workingDirectory: '/test',
      timestamp: new Date()
    };

    const analysis = await detector.detect(context);
    expect(analysis).toBeTruthy();
    expect(analysis?.type).toBe(ErrorType.COMMAND);
    expect(analysis?.suggestion).toContain('gitx');
  });

  test('extracts file and line information', async () => {
    const context = {
      command: 'node app.js',
      output: '',
      error: `TypeError: Cannot read property 'name' of undefined
    at Object.<anonymous> (/Users/test/app.js:42:15)
    at Module._compile (internal/modules/cjs/loader.js:999:30)`,
      workingDirectory: '/test',
      timestamp: new Date()
    };

    const analysis = await detector.detect(context);
    expect(analysis).toBeTruthy();
    expect(analysis?.file).toBe('/Users/test/app.js');
    expect(analysis?.line).toBe(42);
  });

  test('returns unknown error for unrecognized patterns', async () => {
    const context = {
      command: 'some-command',
      output: '',
      error: 'Some random error occurred',
      workingDirectory: '/test',
      timestamp: new Date()
    };

    const analysis = await detector.detect(context);
    expect(analysis).toBeTruthy();
    expect(analysis?.type).toBe(ErrorType.UNKNOWN);
    expect(analysis?.confidence).toBeLessThan(0.8);
  });
});