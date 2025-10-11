## Running Tests

This project uses [Vitest](https://vitest.dev/) for unit testing. Tests cover the core conversion logic and utility functions for the Vue `defineProps` extension.

### Available Tests

- **`convertProps`**  
  Verifies that object-style `defineProps({})` is correctly converted to type-safe, destructured `defineProps<{}>()`, preserving:
  - Default values  
  - Required vs optional props  
  - Multi-line comments and inline comments

- **`extractProps`**  
  Ensures that prop names, values, and all types of comments (`//` and `/** */`) are correctly extracted.

### Running Tests

1. Install dependencies:

```bash
pnpm install
# or
npm install

2. Run tests:

```bash
pnpm test
# or
npx vitest
```