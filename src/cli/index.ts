#!/usr/bin/env bun

import { Command } from 'commander';
import { DebugEngine } from '@/core/debugEngine.ts';
import { executeCommand, captureLastCommand, createDebugContext } from '@/utils/commandExecutor.ts';
import { 
  printHeader, 
  printSection, 
  formatError, 
  formatSuccess,
  formatInfo,
  formatWarning,
  createSpinner,
  printCodeBlock,
  printList,
  colors
} from '@/utils/terminal.ts';
import readline from 'readline';

// Version is hardcoded for compiled binary compatibility
const VERSION = '0.1.0';

const program = new Command();

program
  .name('buggywug')
  .description('A local debugging assistant that helps fix errors in your terminal')
  .version(VERSION);

program
  .command('debug [command...]')
  .description('Debug a command or the last executed command')
  .option('-m, --model <model>', 'Specify the Ollama model to use', 'llama3.2:latest')
  .option('-v, --verbose', 'Show detailed debugging information')
  .action(async (commandParts, options) => {
    printHeader();
    
    const debugEngine = new DebugEngine();
    
    // Initialize the debug engine
    const initSpinner = createSpinner('Initializing debug engine...');
    initSpinner.start();
    
    try {
      await debugEngine.initialize();
      initSpinner.succeed('Debug engine initialized');
    } catch (error) {
      initSpinner.fail('Failed to initialize debug engine');
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }

    // Determine the command to debug
    let command: string;
    if (commandParts && commandParts.length > 0) {
      command = commandParts.join(' ');
    } else {
      const lastCommand = await captureLastCommand();
      if (!lastCommand) {
        console.error(formatError('No command specified and unable to retrieve last command'));
        process.exit(1);
      }
      command = lastCommand;
      console.log(formatInfo(`Debugging last command: ${command}`));
    }

    // Execute the command
    printSection('Executing Command');
    console.log(colors.muted(`$ ${command}`));
    
    const execSpinner = createSpinner('Running command...');
    execSpinner.start();
    
    const result = await executeCommand(command);
    
    if (result.exitCode === 0) {
      execSpinner.succeed('Command executed successfully');
      if (result.stdout) {
        printCodeBlock(result.stdout);
      }
      process.exit(0);
    }
    
    execSpinner.fail(`Command failed with exit code ${result.exitCode}`);
    
    // Create debug context
    const context = createDebugContext(command, result);
    const sessionId = await debugEngine.createSession(context);
    
    // Show error output
    if (result.stderr) {
      printSection('Error Output');
      printCodeBlock(result.stderr, 'error');
    }
    
    // Analyze the error
    printSection('Analyzing Error');
    const analysisSpinner = createSpinner('Analyzing error...');
    analysisSpinner.start();
    
    const analysis = await debugEngine.analyzeError(sessionId);
    
    if (!analysis) {
      analysisSpinner.fail('Unable to analyze error');
      process.exit(1);
    }
    
    analysisSpinner.succeed('Error analyzed');
    
    console.log();
    console.log(colors.primary('Error Type:'), analysis.type);
    console.log(colors.primary('Confidence:'), `${(analysis.confidence * 100).toFixed(0)}%`);
    
    if (analysis.file) {
      console.log(colors.primary('File:'), `${analysis.file}:${analysis.line || '?'}`);
    }
    
    if (analysis.suggestion) {
      printSection('Analysis');
      console.log(analysis.suggestion);
    }
    
    // Generate fixes
    printSection('Generating Fixes');
    const fixSpinner = createSpinner('Generating fixes...');
    fixSpinner.start();
    
    const fixes = await debugEngine.generateFixes(sessionId);
    
    if (fixes.length === 0) {
      fixSpinner.fail('No automatic fixes available');
      process.exit(1);
    }
    
    fixSpinner.succeed(`Generated ${fixes.length} potential fix${fixes.length > 1 ? 'es' : ''}`);
    
    console.log();
    printList(fixes.map((fix, i) => 
      `${colors.primary(`[${i + 1}]`)} ${fix.description} ${colors.muted(`(${(fix.confidence * 100).toFixed(0)}% confidence)`)}`
    ));
    
    // Ask user which fix to apply
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `\n${colors.primary('?')} Which fix would you like to apply? (1-${fixes.length}, or 'n' to skip): `,
        resolve
      );
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'n') {
      console.log(formatInfo('No fix applied'));
      process.exit(0);
    }
    
    const fixIndex = parseInt(answer) - 1;
    if (isNaN(fixIndex) || fixIndex < 0 || fixIndex >= fixes.length) {
      console.error(formatError('Invalid selection'));
      process.exit(1);
    }
    
    // Apply the fix
    const applySpinner = createSpinner('Applying fix...');
    applySpinner.start();
    
    try {
      await debugEngine.applyFix(sessionId, fixIndex);
      applySpinner.succeed('Fix applied successfully');
      
      // Re-run the original command
      console.log();
      console.log(formatInfo('Re-running original command...'));
      console.log(colors.muted(`$ ${command}`));
      
      const retryResult = await executeCommand(command);
      
      if (retryResult.exitCode === 0) {
        console.log(formatSuccess('Command now runs successfully!'));
        if (retryResult.stdout) {
          printCodeBlock(retryResult.stdout);
        }
      } else {
        console.log(formatWarning('Command still failing. You may need to try a different fix.'));
      }
    } catch (error) {
      applySpinner.fail('Failed to apply fix');
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

program
  .command('models')
  .description('List available Ollama models')
  .action(async () => {
    printHeader();
    
    const debugEngine = new DebugEngine();
    const spinner = createSpinner('Fetching available models...');
    spinner.start();
    
    try {
      await debugEngine.initialize();
      const ollamaService = (debugEngine as any).ollamaService;
      const models = await ollamaService.listModels();
      
      spinner.succeed('Models fetched');
      
      printSection('Available Models');
      if (models.length === 0) {
        console.log(formatWarning('No models found. Pull a model with: ollama pull <model-name>'));
      } else {
        printList(models);
      }
    } catch (error) {
      spinner.fail('Failed to fetch models');
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

program
  .command('pull <model>')
  .description('Pull an Ollama model')
  .action(async (model) => {
    printHeader();
    
    const debugEngine = new DebugEngine();
    console.log(formatInfo(`Pulling model: ${model}`));
    
    try {
      const ollamaService = (debugEngine as any).ollamaService;
      await ollamaService.pullModel(model, (progress: number) => {
        process.stdout.write(`\rProgress: ${progress.toFixed(2)}%`);
      });
      console.log(); // New line after progress
      console.log(formatSuccess(`Model ${model} pulled successfully!`));
    } catch (error) {
      console.error(formatError(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// Interactive mode when no command is specified
if (process.argv.length === 2) {
  program.action(async () => {
    printHeader();
    console.log(formatInfo('No command specified. Use "buggywug --help" for usage information.'));
    console.log();
    console.log('Quick start:');
    printList([
      'buggywug debug          - Debug the last command',
      'buggywug debug <cmd>    - Debug a specific command',
      'buggywug models         - List available models',
      'buggywug pull <model>   - Pull a new model'
    ]);
  });
}

program.parse();