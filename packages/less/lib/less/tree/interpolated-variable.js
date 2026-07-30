// @ts-check
/** @import { FileInfo } from './node.js' */
/** @import Node from './node.js' */
import Variable from './variable.js';
import Property from './property.js';
import VariableCall from './variable-call.js';
import NamespaceValue from './namespace-value.js';
import { LOOKUP_KEY, VARIABLE_WITH_LOOKUPS } from '../parser/lookup-pattern.js';

/**
 * Interpolation resolved by string replacement at eval time.
 *
 * The parser consumes `@{name[key]}` structurally via `entities.variableCurly`,
 * but `Quoted` and inline JavaScript hold their contents as raw text and can only
 * substitute at eval time. Both share this module so the two evaluation paths build
 * identical nodes from identical patterns.
 */

/** Matches `@{name}` and `@{name[a][b]}`, capturing the reference. */
export const VARIABLE_INTERPOLATION = new RegExp(`@\\{(${VARIABLE_WITH_LOOKUPS})\\}`, 'g');

/**
 * Matches `${name}`, capturing the reference.
 *
 * Deliberately narrower than {@link VARIABLE_INTERPOLATION}: a lookup chain is not
 * part of the property grammar. `entities.property` parses `$name` with no lookup
 * handling, so `$map[key]` is a property reference followed by the literal text
 * `[key]`, and a property cannot hold a ruleset to look into in the first place
 * (`prop: { … }` is a parse error in every scope). Accepting `${map[key]}` here
 * would invent syntax the language does not have.
 */
export const PROPERTY_INTERPOLATION = /\$\{([\w-]+)\}/g;

const LOOKUP_SEGMENT = new RegExp(`\\[(${LOOKUP_KEY})\\]`, 'g');

// Non-global twins for membership tests. `RegExp.test` on a /g regex advances
// `lastIndex` and so returns alternating results across calls on shared instances.
const HAS_VARIABLE_INTERPOLATION = new RegExp(VARIABLE_INTERPOLATION.source);
const HAS_PROPERTY_INTERPOLATION = new RegExp(PROPERTY_INTERPOLATION.source);

/**
 * Whether text contains an `@{...}` or `${...}` interpolation.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasInterpolation(text) {
    return HAS_VARIABLE_INTERPOLATION.test(text) || HAS_PROPERTY_INTERPOLATION.test(text);
}

/**
 * Split a `name[a][b]` reference into its name and lookup keys.
 *
 * `lookups` is null for a plain reference, so callers keep using the cheaper
 * `Variable`/`Property` node when there is no lookup to resolve.
 *
 * @param {string} raw
 * @returns {{ name: string, lookups: string[] | null }}
 */
export function splitLookups(raw) {
    const open = raw.indexOf('[');
    if (open === -1) {
        return { name: raw, lookups: null };
    }
    /** @type {string[]} */
    const lookups = [];
    const re = new RegExp(LOOKUP_SEGMENT.source, 'g');
    let match;
    while ((match = re.exec(raw)) !== null) {
        lookups.push(match[1]);
    }
    return { name: raw.slice(0, open), lookups };
}

/**
 * Build the node for an interpolated `@variable` reference, with or without lookups.
 *
 * @param {string} raw - the reference text inside `@{...}`
 * @param {number} index
 * @param {FileInfo} fileInfo
 * @returns {Node}
 */
export function resolveInterpolatedVariable(raw, index, fileInfo) {
    const { name, lookups } = splitLookups(raw);
    if (!lookups) {
        return new Variable(`@${name}`, index, fileInfo);
    }
    return new NamespaceValue(
        new VariableCall(`@${name}`, index, fileInfo), lookups, index, fileInfo
    );
}

/**
 * Build the node for an interpolated `$property` reference.
 *
 * No lookup handling: see {@link PROPERTY_INTERPOLATION}. Properties have no lookup
 * grammar, so `raw` is always a bare name here.
 *
 * @param {string} raw - the reference text inside `${...}`
 * @param {number} index
 * @param {FileInfo} fileInfo
 * @returns {Node}
 */
export function resolveInterpolatedProperty(raw, index, fileInfo) {
    return new Property(`$${raw}`, index, fileInfo);
}
