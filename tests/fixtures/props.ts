export const PropsWithComments = {
  js: `defineProps({
  /** fetches URL */
  test: {
    type: String,
    required: true
  },
  // another comment
  count: {
    type: Number,
    default: 0
  },
  /**
   * List of component names to include in auto-registration. If unset or empty, all components will be included.
   * @default []
   */
  complicated: {
    type: Array,
  }
})`,
  ts: `const {
  test,
  count = 0,
  complicated
} = defineProps<{
  /** fetches URL */
  test: string
  // another comment
  count?: number
  /**
     * List of component names to include in auto-registration. If unset or empty, all components will be included.
     * @default []
     */
  complicated?: any[]
}>()`,
}

export const PropsWithObjectType = {
  js: `const props = defineProps({
  data: {
    type: Object as PropType<{ a: number, b: string }>,
    default: () => ({ a: 1, b: 'x' })
  },
})`,
  ts: `const { data = { a: 1, b: 'x' } } = defineProps<{
  data?: {
    a: number;
    b: string;
  }
}>()`,
}

export const PropsWithMixedTypes = {
  js: `defineProps({
  title: String,
  likes: Number,
  isActive: Boolean,
  items: Array,
  config: Object
})`,
  ts: `const props = defineProps<{
  title?: string
  likes?: number
  isActive?: boolean
  items?: any[]
  config?: Record<string, any>
}>()`,
}

export const PropsWithArrowDefaults = {
  js: `defineProps({
  count: { type: Number, default: () => 5 },
  user: { type: Object, default: () => ({ name: 'Arash', age: 25 }) }
})`,
  ts: `const {
  count = 5,
  user = { name: 'Arash', age: 25 }
} = defineProps<{
  count?: number
  user?: Record<string, any>
}>()`,
}

export const PropsWithFunctionTypes = {
  js: `defineProps({
  onClick: Function,
  callback: { type: Function, required: true }
})`,
  ts: `const props = defineProps<{
  onClick?: (...args: any[]) => any
  callback: (...args: any[]) => any
}>()`,
}

export const PropsWithNestedObjectType = {
  js: `defineProps({
  options: {
    type: Object as PropType<{ a: number; nested: { x: string } }>
  }
})`,
  ts: `const props = defineProps<{
  options?: {
    a: number;
    nested: {
      x: string;
    };
  }
}>()`,
}

export const PropsWithArrayType = {
  js: `defineProps({
  values: {
    type: Array as PropType<number[]>,
    default: () => [1, 2, 3]
  }
})`,
  ts: `const { values = [1, 2, 3] } = defineProps<{
  values?: number[]
}>()`,
}


export const PropsWithStringLiteralKey = {
  js: `defineProps({
  'weird-key': {
    type: String,
    default: 'test'
  },
  "super🔥 value": Number,
  "some key here": Boolean,
})`,
  ts: `const {
  weirdKey = 'test',
  superValue,
  someKeyHere
} = defineProps<{
  weirdKey?: string
  superValue?: number
  someKeyHere?: boolean
}>()`,
}

// TODO
// export const PropsWithNumericKeys = {
//   js: `defineProps({
//   123: {
//     type: Number,
//     default: 10
//   }
// })`,
//   ts: `const {
//   123: 123 = 10
// } = defineProps<{
//   123?: number
// }>()`,
// }

export const PropsWithTupleType = {
  js: `defineProps({
  position: {
    type: Array as PropType<[number, number]>
  }
})`,
  ts: `const props = defineProps<{
  position?: [number, number]
}>()`,
}

export const PropsWithManyLongProps = {
  js: `defineProps({
  username: { type: String, required: true },
  bio: { type: String },
  theme: { type: String, default: 'light' },
  tags: { type: Array, default: () => ['a', 'b', 'c'] },
  meta: { type: Object }
})`,
  ts: `const {
  username,
  bio,
  theme = 'light',
  tags = ['a', 'b', 'c'],
  meta
} = defineProps<{
  username: string
  bio?: string
  theme?: string
  tags?: any[]
  meta?: Record<string, any>
}>()`,
}
