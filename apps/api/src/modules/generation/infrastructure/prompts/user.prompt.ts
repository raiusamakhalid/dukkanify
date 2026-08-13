import type { Locale } from '@dukkanify/contracts';
import type { BlueprintRepairContext } from '../../domain/ports/ai-generator.port';

/** How many characters of a rejected blueprint to quote back. Enough to locate the fault. */
const MAX_ECHOED_OUTPUT = 6_000;

const LOCALE_DIRECTION: Record<Locale, string> = {
  en: 'English, left-to-right',
  ar: 'Arabic, right-to-left — write every user-facing string in Arabic',
};

export function buildUserPrompt(prompt: string, locale: Locale): string {
  return `The merchant asks for:

"""
${prompt}
"""

Store locale: ${locale} (${LOCALE_DIRECTION[locale]}).

Design this storefront and return it through the tool.`;
}

/**
 * The repair turn (architecture.md §7).
 *
 * A blind retry re-rolls the same failure; this hands back the exact output and the exact
 * complaints about it, which is the information the first attempt was missing. The issues
 * arrive already carrying paths and human-readable messages from the contract, so nothing
 * here has to interpret them — quoting them faithfully is the whole job.
 */
export function buildRepairPrompt(
  prompt: string,
  locale: Locale,
  repair: BlueprintRepairContext,
): string {
  const issues = repair.issues
    .map((issue) => `- ${issue.path}: ${issue.message}`)
    .join('\n');

  return `${buildUserPrompt(prompt, locale)}

Your previous attempt was rejected. This is what you sent:

\`\`\`json
${truncate(serialise(repair.previous))}
\`\`\`

These are the problems with it, each naming the exact field:

${issues}

Fix only what is listed, keep everything else as it was, and return the corrected blueprint through the tool.`;
}

function serialise(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Circular or otherwise unserialisable output is itself the problem worth reporting.
    return '(the previous response could not be read as JSON)';
  }
}

function truncate(text: string): string {
  return text.length <= MAX_ECHOED_OUTPUT
    ? text
    : `${text.slice(0, MAX_ECHOED_OUTPUT)}\n… (truncated)`;
}
