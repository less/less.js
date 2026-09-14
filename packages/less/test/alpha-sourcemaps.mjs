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

/** Assert a JSON string is a v3 source map; `allowEmpty` for empty input. */
function assertV3Map(json, { allowEmpty = false } = {}) {
  const map = JSON.parse(json);
  assert.equal(map.version, 3, 'source map must be version 3');
  assert.ok(Array.isArray(map.sources), 'map.sources must be an array');
  assert.equal(typeof map.mappings, 'string', 'map.mappings must be a string');
  if (!allowEmpty) {
    assert.ok(map.sources.length > 0, 'map must carry at least one source');
    assert.ok(map.mappings.length > 0, 'map must carry mappings');
  }
  return map;
}

// 1. `sourceMap: true` returns a v3 map; no annotation is written without an
//    explicit URL or inline request.
{
  const { css, map } = await less.render(SRC, { sourceMap: true });
  assert.ok(map, 'sourceMap: true must return result.map');
  assertV3Map(map);
  assert.doesNotMatch(css, /sourceMappingURL/, 'no annotation without a URL/inline request');
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

console.log('Less 5 alpha source-map artifact checks passed');
