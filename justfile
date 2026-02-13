set dotenv-load := false

# Build the standalone Bun binary into target/statusline
build-binary:
    bun run build:binary

# Build then install the binary to ~/.claude/
install-binary: build-binary
    bun run install:binary

# Format code with Biome
biome-format:
    bun run biome:format

# Lint and auto-fix with Biome
biome-lint:
    bun run biome:lint

# Format, lint, then build and install
build: biome-format biome-lint install-binary

