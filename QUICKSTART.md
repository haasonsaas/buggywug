# Buggywug Quick Start Guide

## Installation

1. **Install Prerequisites**
   ```bash
   # Install Bun
   curl -fsSL https://bun.sh/install | bash
   
   # Install Ollama
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Install Buggywug**
   ```bash
   git clone <your-repo>
   cd buggywug
   bun install
   ```

## First Run

1. **Test with the example broken script**
   ```bash
   bun run dev debug node examples/broken-script.js
   ```

2. **Debug your own command**
   ```bash
   bun run dev debug <your-command>
   ```

3. **Debug the last command**
   ```bash
   bun run dev debug
   ```

## Common Use Cases

### Missing Module Error
```bash
# Run a script with missing dependencies
bun run dev debug node app.js
# Buggywug will detect the missing module and suggest installing it
```

### Syntax Error
```bash
# Run a script with syntax errors
bun run dev debug bun broken.ts
# Buggywug will identify the syntax error and explain the fix
```

### Permission Error
```bash
# Try to run a non-executable file
bun run dev debug ./script.sh
# Buggywug will suggest making it executable
```

## Tips

- Use `--verbose` flag for detailed debugging info
- Run `buggywug models` to see available AI models
- Pull a specific model with `buggywug pull codellama:latest`
- The first run may take time as it downloads the default model

## Troubleshooting

**"Ollama is not available"**
- Make sure Ollama is running: `ollama serve`
- Check if it's accessible: `curl http://localhost:11434/api/tags`

**"Model not found"**
- Pull the default model: `ollama pull llama3.2:latest`
- Or use a different model: `bun run dev debug --model <model-name> <command>`

**"Command not found: fc"**
- The shell history feature may not work in all shells
- Specify the command explicitly: `buggywug debug <command>`