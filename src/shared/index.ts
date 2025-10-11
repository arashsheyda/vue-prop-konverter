/**
 * Checks if a Vue script block is `<script setup lang="ts">` 
 * or `<script lang="ts" setup>` (order-independent).
 */
export function isScriptSetupTs(text: string): boolean {
  return /<script\b(?=[^>]*\bsetup\b)(?=[^>]*\blang=["']ts["'])/.test(text)
}

/**
 * Regex for object-style defineProps detection.
 * Matches: defineProps({...}) with optional const/let/var destructuring.
 */
export const definePropsRegex = /(?:\b(?:const|let|var)\s*(?:\{[\s\S]*?\}|\w+)\s*=\s*)?defineProps\s*\(/g
