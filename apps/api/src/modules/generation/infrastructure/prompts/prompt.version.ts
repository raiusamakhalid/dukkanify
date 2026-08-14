/**
 * The revision of the system prompt, written onto every store it generates.
 *
 * Bump it whenever `system.prompt.ts` changes in a way that could change output. That is
 * what makes "generation got worse last Tuesday" a query rather than an argument (§7):
 * `SELECT promptVersion, count(*) FROM "Store"` attributes quality to a specific revision.
 */
export const PROMPT_VERSION = '2026-08-14.1';

/**
 * Reported by the mock provider instead. A store assembled from a fixture is not evidence
 * about a prompt, and labelling it with one would poison exactly the query above.
 */
export const MOCK_PROMPT_VERSION = 'mock.1';
