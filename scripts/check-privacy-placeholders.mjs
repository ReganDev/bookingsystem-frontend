#!/usr/bin/env node
/**
 * Build guard for src/content/privacyPolicy.ts.
 *
 * The privacy policy page only warns about unfilled REPLACE_ME values on the
 * page itself (see hasUnfilledDetails / unfilledDetailKeys) — that only
 * protects someone who actually visits /privacy. A routine `npm run build`
 * would otherwise happily ship a policy that reads "operated by REPLACE_ME".
 *
 * This script reads privacyPolicy.ts as plain text (it is TypeScript, so a
 * plain Node script cannot `import` it without a build step) and checks every
 * `key: value` pair inside the `privacyDetails` object for the placeholder
 * sentinel. It is intentionally scoped to that one object so it does not
 * false-positive on the `export const PLACEHOLDER = 'REPLACE_ME'` declaration
 * itself, or on comments that mention PLACEHOLDER in prose.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TARGET_PATH = path.join(
  __dirname,
  '..',
  'src',
  'content',
  'privacyPolicy.ts',
)
const PLACEHOLDER_IDENTIFIER = 'PLACEHOLDER'

function main() {
  let source
  try {
    source = readFileSync(TARGET_PATH, 'utf8')
  } catch (err) {
    console.error(
      `check-privacy-placeholders: could not read ${TARGET_PATH}: ${err.message}`,
    )
    process.exit(1)
  }

  const objectMatch = source.match(
    /export const privacyDetails\s*=\s*\{([\s\S]*?)\n\}/,
  )
  if (!objectMatch) {
    console.error(
      `check-privacy-placeholders: could not locate the privacyDetails object in ${TARGET_PATH}. ` +
        'Has it been renamed or restructured? Update this script to match.',
    )
    process.exit(1)
  }

  const offendingKeys = []

  for (const rawLine of objectMatch[1].split('\n')) {
    // Strip a trailing inline comment before inspecting the line, but skip
    // whole-line comments and blank lines outright — a comment can mention
    // PLACEHOLDER in prose without that being an unfilled value.
    const withoutTrailingComment = rawLine.replace(/\/\/.*$/, '').trim()
    if (
      withoutTrailingComment === '' ||
      withoutTrailingComment.startsWith('/*') ||
      withoutTrailingComment.startsWith('*')
    ) {
      continue
    }

    const assignment = withoutTrailingComment.match(/^(\w+):\s*(.+?),?$/)
    if (!assignment) continue

    const [, key, rawValue] = assignment
    const value = rawValue.trim()
    if (value === PLACEHOLDER_IDENTIFIER) {
      offendingKeys.push(key)
    }
  }

  if (offendingKeys.length > 0) {
    console.error(
      'check-privacy-placeholders: src/content/privacyPolicy.ts still has ' +
        `REPLACE_ME placeholder values for: ${offendingKeys.join(', ')}.\n` +
        'Fill these in before building — a published policy must not read ' +
        '"REPLACE_ME". See src/content/privacyPolicy.ts.',
    )
    process.exit(1)
  }

  console.log(
    'check-privacy-placeholders: no REPLACE_ME placeholders remain in privacyPolicy.ts.',
  )
  process.exit(0)
}

main()
