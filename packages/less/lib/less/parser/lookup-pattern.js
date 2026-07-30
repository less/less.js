// @ts-check
/**
 * Shared source-of-truth for the `[...]` lookup grammar.
 *
 * The parser consumes lookups structurally (`parsers.mixin.ruleLookups()`), but
 * `Quoted` resolves interpolation by string replacement at eval time and so needs
 * an equivalent regular expression. Keeping the pattern in one place is what stops
 * the two from drifting apart — the drift is precisely why `@{map[key]}` used to be
 * emitted verbatim instead of being substituted.
 *
 * A key mirrors `parsers.entities.lookupValue`: an optional `@`/`@@`/`$`/`$$`
 * sigil followed by identifier characters. It may be empty (`@map[]` resolves to
 * the last declaration). Critically the key pattern contains no brackets, so a
 * lookup key can never itself be a lookup — `@{a[@b[c]]}` is not grammatical.
 * A non-nesting regex is therefore exactly equivalent to the parsed grammar here
 * rather than an approximation of it.
 */

/** A single lookup key, e.g. `key`, `@key`, `@@key`, `$key`, or empty. */
export const LOOKUP_KEY = '(?:[@$]{0,2})[_a-zA-Z0-9-]*';

/** Zero or more chained lookups, e.g. `[a]`, `[a][b]`, `[@a][]`. */
export const LOOKUP_CHAIN = `(?:\\[${LOOKUP_KEY}\\])*`;

/** A variable name followed by an optional lookup chain, e.g. `map[@a][b]`. */
export const VARIABLE_WITH_LOOKUPS = `[\\w-]+${LOOKUP_CHAIN}`;
