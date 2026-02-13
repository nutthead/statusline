set dotenv-load := false

# Check, format, lint, and organize imports with Biome
check:
    bun biome check --write --assist-enabled=true

# Build the standalone Bun binary into target/statusline
build: check
    bun run build:binary

# Build then install the binary to ~/.claude/
install: build
    bun run install:binary


