/**
 * Checks if a Vue script block is `<script setup lang="ts">` 
 * or `<script lang="ts" setup>` (order-independent).
 */
export function isScriptSetupTs(text: string): boolean {
  return /<script\b(?=[^>]*\bsetup\b)(?=[^>]*\blang=["']ts["'])/.test(text)
}
