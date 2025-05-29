import chalk from 'chalk';
import ora from 'ora';

export const colors = {
  primary: chalk.cyan,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  muted: chalk.gray
};

export function formatError(message: string): string {
  return colors.error(`✖ ${message}`);
}

export function formatSuccess(message: string): string {
  return colors.success(`✓ ${message}`);
}

export function formatInfo(message: string): string {
  return colors.info(`ℹ ${message}`);
}

export function formatWarning(message: string): string {
  return colors.warning(`⚠ ${message}`);
}

export function createSpinner(text: string) {
  return ora({
    text,
    color: 'cyan'
  });
}

export function printHeader() {
  console.log();
  console.log(colors.primary.bold('🐛 Buggywug - Debug Assistant'));
  console.log(colors.muted('─'.repeat(30)));
  console.log();
}

export function printSection(title: string) {
  console.log();
  console.log(colors.primary.bold(title));
  console.log(colors.muted('─'.repeat(title.length)));
}

export function printCodeBlock(code: string, language = '') {
  console.log();
  console.log(colors.muted('```' + language));
  console.log(code);
  console.log(colors.muted('```'));
  console.log();
}

export function printList(items: string[], ordered = false) {
  items.forEach((item, index) => {
    const prefix = ordered ? `${index + 1}.` : '•';
    console.log(colors.muted(prefix), item);
  });
}