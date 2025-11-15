<p align="center">
  <img src="./assets/icon.png" width="377" alt="Vue Prop Konverter logo" />
</p>

<h1 align="center">Vue Prop Konverter</h1>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=arashsheyda.vue-prop-konverter">
    <img src="https://img.shields.io/visual-studio-marketplace/v/arashsheyda.vue-prop-konverter?color=42b883&label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="VS Code Marketplace Version" />
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=arashsheyda.vue-prop-konverter">
    <img src="https://img.shields.io/badge/Install%20on-VS%20Code-007ACC?logo=visual-studio-code" alt="Install on VS Code" />
  </a>
</p>

Convert Vue <code>defineProps()</code> object-style definitions into <b>type-safe, destructured TypeScript</b> automatically in VS Code.

---

> [!WARNING]
> This extension is currently in **beta**. Some features may not work perfectly. For example:
> - Callback props may not be correctly inferred
> - Extremely dynamic or computed prop definitions
> - Certain nested default values or unusual object syntax
> Please report any issues on the [GitHub repository](https://github.com/arashsheyda/vue-prop-konverter/issues).

## Features

- Converts **object-style `defineProps`** to TypeScript generic + destructuring syntax
- Automatically replaces `props.propName` usages with destructured variables
- Supports:
  - Default values
  - Required props
  - `PropType<T>` for arrays, objects, or custom types
- Works only in typescript blocks (`<script lang="ts">`)
- QuickFix via the VS Code **lightbulb**

## Demo

**Before:**

```ts
const props = defineProps({
  title: {
    type: String,
    default: 'Untitled',
  },
  isPublished: {
    type: Boolean,
    required: true,
  },
  tags: {
    type: Array as PropType<string[]>,
    default: () => ['vue', 'typescript'],
  },
  metadata: {
    type: Object as PropType<{ author: string; date: string }>,
    default: () => ({ author: 'Unknown', date: new Date().toISOString() }),
  },
  maxItems: {
    type: Number,
    default: 10,
  },
  callback: {
    type: Function as PropType<() => void>,
  },
})
```

**After conversion:**

```ts
const {
  title = 'Untitled',
  isPublished,
  tags = (['vue', 'typescript']),
  metadata = ({ author: 'Unknown', date: new Date().toISOString() }),
  maxItems = 10,
} = defineProps<{
  title?: string
  isPublished: boolean
  tags?: string[]
  metadata?: { author: string; date: string }
  maxItems?: number
}>()
```

---

## Installation

### From VS Code Marketplace

1. Open Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Search for *Vue Prop Konverter*
3. Click Install

### Locally (for development)

```bash
git clone https://github.com/yourusername/vue-prop-konverter.git
cd vue-prop-konverter
pnpm install
pnpm run build
```

Then press `F5` in VS Code to open a Development Extension Host with the extension loaded.

## Usage

1. Open a `.vue` file with `<script setup lang="ts">`
2. Place your cursor over a `defineProps()` object-style declaration
3. Click the lightbulb or press `Ctrl` + `.` / `Cmd` + `.`
4. Select `Replace defineProps() with type-safe variant and update usage`
5. The props will be converted automatically

## Requirements

- VS Code 1.90+
- Vue 3 with `<script setup lang="ts">`
- TypeScript installed in your project

## Extension Settings

No additional settings required — works out of the box.

## Contributing

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Make your changes & run `pnpm lint` and `pnpm build`
4. Submit a [pull request](https://github.com/arashsheyda/vue-prop-konverter/pulls)

## License

[MIT © 2025 Arash Sheyda](LICENSE)