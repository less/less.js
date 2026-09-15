/**
 * Source-map artifact checks. The corpus `sourcemaps*` fixtures are config-only
 * (they enable `sourceMap` via styles.config, several also use `globalVars`) and
 * ship no plain `.css` golden, so the byte-identical fixture harness cannot gate
 * them. This suite exercises the map artifact directly: v3 shape, the annotation
 * variants (default / URL / inline base64 / disabled), the flat legacy options,
 * and the empty-input edge.
 */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';

import less from '../lib/index.js';

const SRC = '.a {\n  color: red;\n  .b { width: (1 + 1); }\n}\n';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode one base64-VLQ segment (SourceMap rev-3) into signed fields. */
function decodeVlq(segment) {
  const values = [];
  let i = 0;
  while (i < segment.length) {
    let result = 0;
    let shift = 0;
    let cont;
    do {
      const digit = B64.indexOf(segment[i++]);
      assert.ok(digit >= 0, `invalid base64-VLQ char in mappings: ${JSON.stringify(segment)}`);
      cont = digit & 32;
      result += (digit & 31) << shift;
      shift += 5;
    } while (cont);
    values.push(result & 1 ? -(result >>> 1) : result >>> 1);
  }
  return values;
}

/**
 * Decode a v3 `mappings` string into absolute segments, resolving the running
 * deltas. Each mapped segment carries { genLine, genCol, srcIdx, srcLine, srcCol }.
 */
function decodeMappings(mappings) {
  const segments = [];
  let srcIdx = 0;
  let srcLine = 0;
  let srcCol = 0;
  mappings.split(';').forEach((line, genLine) => {
    if (!line) {
      return;
    }
    let genCol = 0;
    for (const raw of line.split(',')) {
      const fields = decodeVlq(raw);
      genCol += fields[0];
      const seg = { genLine, genCol };
      if (fields.length >= 4) {
        srcIdx += fields[1];
        srcLine += fields[2];
        srcCol += fields[3];
        Object.assign(seg, { srcIdx, srcLine, srcCol });
      }
      segments.push(seg);
    }
  });
  return segments;
}

/**
 * Assert a JSON string is a v3 source map whose mappings decode to in-bounds,
 * non-negative positions referencing real sources. Returns the parsed map plus
 * decoded segments. `allowEmpty` skips the non-empty requirement (empty input).
 */
function assertV3Map(json, { allowEmpty = false } = {}) {
  const map = JSON.parse(json);
  assert.equal(map.version, 3, 'source map must be version 3');
  assert.ok(Array.isArray(map.sources), 'map.sources must be an array');
  assert.equal(typeof map.mappings, 'string', 'map.mappings must be a string');
  if (!allowEmpty) {
    assert.ok(map.sources.length > 0, 'map must carry at least one source');
    assert.ok(map.mappings.length > 0, 'map must carry mappings');
  }
  const segments = decodeMappings(map.mappings);
  for (const seg of segments) {
    assert.ok(seg.genCol >= 0, 'generated column must be non-negative');
    if ('srcIdx' in seg) {
      assert.ok(
        seg.srcIdx >= 0 && seg.srcIdx < map.sources.length,
        `mapping source index ${seg.srcIdx} out of range (sources: ${map.sources.length})`
      );
      assert.ok(seg.srcLine >= 0 && seg.srcCol >= 0, 'source position must be non-negative');
    }
  }
  return { map, segments };
}

// 1. `sourceMap: true` returns a v3 map whose mappings round-trip to the real
//    source positions; no annotation is written without a URL/inline request.
{
  const { css, map } = await less.render(SRC, { sourceMap: true });
  assert.ok(map, 'sourceMap: true must return result.map');
  const { map: parsed, segments } = assertV3Map(map);
  assert.doesNotMatch(css, /sourceMappingURL/, 'no annotation without a URL/inline request');

  // SRC line 1 (0-based) is `color: red;` and line 2 is the `.b` rule; the
  // mappings must reference those real source lines, not arbitrary positions.
  const srcLines = new Set(segments.filter(s => 'srcLine' in s).map(s => s.srcLine));
  assert.ok(srcLines.has(1), 'a mapping must point at the `color: red` source line');
  assert.ok(srcLines.has(2), 'a mapping must point at the nested `.b` source line');

  // sourcesContent has one slot per source; content is null unless
  // outputSourceFiles is set (see check 7), matching Less 4.x.
  assert.ok(Array.isArray(parsed.sourcesContent), 'map must have a sourcesContent array');
  assert.equal(parsed.sourcesContent.length, parsed.sources.length,
    'sourcesContent must have one slot per source');
}

// 2. `sourceMapURL` writes a plain annotation referencing that URL.
{
  const { css } = await less.render(SRC, { sourceMap: { sourceMapURL: 'out.css.map' } });
  assert.match(css, /\/\*# sourceMappingURL=out\.css\.map \*\//, 'sourceMapURL annotation present');
}

// 3. `sourceMapFileInline` embeds the map as a base64 data URI that decodes to v3.
{
  const { css } = await less.render(SRC, { sourceMap: { sourceMapFileInline: true } });
  const match = css.match(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/);
  assert.ok(match, 'inline base64 annotation present');
  assertV3Map(Buffer.from(match[1], 'base64').toString('utf8'));
}

// 4. `disableSourcemapAnnotation` suppresses the annotation but still returns the map.
{
  const { css, map } = await less.render(SRC, {
    sourceMap: { disableSourcemapAnnotation: true, sourceMapURL: 'x' }
  });
  assert.ok(map, 'map still returned when the annotation is disabled');
  assert.doesNotMatch(css, /sourceMappingURL/, 'annotation suppressed');
}

// 5. The flat legacy `sourceMap*` options behave like the object form.
{
  const { css } = await less.render(SRC, { sourceMap: true, sourceMapURL: 'flat.css.map' });
  assert.match(css, /sourceMappingURL=flat\.css\.map/, 'flat sourceMapURL honored');
}

// 6. Empty input yields a v3 map (possibly empty) and never crashes.
{
  const { map } = await less.render('', { sourceMap: true });
  assert.ok(map, 'empty input still returns a map');
  assertV3Map(map, { allowEmpty: true });
}

// 7. `outputSourceFiles` embeds the original source into sourcesContent.
{
  const { map } = await less.render(SRC, { sourceMap: { outputSourceFiles: true } });
  const { map: parsed } = assertV3Map(map);
  assert.ok(parsed.sourcesContent.every(c => typeof c === 'string'),
    'outputSourceFiles must embed every source');
  assert.ok(parsed.sourcesContent[0].includes('color: red'),
    'embedded content must be the original Less source');
}

console.log('Less 5 alpha source-map artifact checks passed');
