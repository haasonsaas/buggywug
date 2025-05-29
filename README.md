# 🐛 Buggywug

A local debugging assistant that helps fix errors in your terminal using AI.

## Features

- **Local AI-Powered Debugging**: Uses Ollama for completely offline error analysis
- **Automatic Error Detection**: Recognizes common error patterns and suggests fixes
- **Smart Fix Generation**: Creates actionable solutions you can apply with one click
- **Command Re-execution**: Automatically retries commands after applying fixes
- **Multiple Model Support**: Use any Ollama model for debugging

## Installation

```bash
# Clone the repository
git clone https://github.com/haasonsaas/buggywug.git
cd buggywug

# Install dependencies
bun install

# Run in development
bun run dev

# Or build and install globally
bun run build
bun link
```

## Prerequisites

- **Bun**: Install from [bun.sh](https://bun.sh)
- **Ollama**: Install from [ollama.ai](https://ollama.ai)

## Usage

### Debug the last command
```bash
buggywug debug
```

### Debug a specific command
```bash
buggywug debug npm run build
```

### List available models
```bash
buggywug models
```

### Pull a new model
```bash
buggywug pull codellama:latest
```

## How It Works

1. **Error Capture**: Buggywug runs your command and captures any errors
2. **Pattern Analysis**: Identifies the type of error (syntax, module, permission, etc.)
3. **AI Enhancement**: Uses Ollama to understand the context and suggest fixes
4. **Fix Generation**: Creates specific, actionable fixes you can apply
5. **Verification**: Re-runs the command to verify the fix worked

## Supported Error Types

- **Module Errors**: Missing npm/bun packages
- **Syntax Errors**: Code syntax issues
- **Type Errors**: TypeScript/JavaScript type mismatches  
- **Permission Errors**: File permission issues
- **Command Errors**: Missing commands or incorrect usage
- **Runtime Errors**: General runtime exceptions

## Configuration

Set custom Ollama host:
```bash
export OLLAMA_HOST=http://localhost:11434
```

## Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Build
bun run build
```

## Architecture

```
src/
├── cli/           # Command-line interface
├── core/          # Debugging engine
├── services/      # External service integrations
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

AGPLv3 - See [LICENSE](LICENSE) file for details.