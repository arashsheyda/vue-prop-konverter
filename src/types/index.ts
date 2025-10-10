/**
 * Represents a Vue prop definition extracted from defineProps.
 */
export interface PropDefinition {
  /** Name of the prop */
  name: string

  /** TypeScript type of the prop (inferred or from PropType) */
  type: string

  /** Whether the prop is required */
  required: boolean

  /** Default value expression (if any) */
  defaultValue?: string

  /** Validator function expression (if any) */
  validator?: string
}
