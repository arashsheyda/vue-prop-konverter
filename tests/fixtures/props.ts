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