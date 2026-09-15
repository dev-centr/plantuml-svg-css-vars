import assert from 'node:assert/strict';
import { it } from 'node:test';
import { normalizePlantumlSvgForWeb } from '../src/normalize.js';

it('makes PlantUML SVG responsive and adds themed-svg-root', () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg" width="273px" height="306px" preserveAspectRatio="none" style="width:273px;height:306px;" viewBox="0 0 273 306" data-diagram-type="SEQUENCE"><g class="participant"/></svg>';
  const out = normalizePlantumlSvgForWeb(input);
  assert.match(out, /width="100%"/);
  assert.doesNotMatch(out, /\sheight="/);
  assert.match(out, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(out, /class="themed-svg-root"/);
  assert.match(out, /role="img"/);
  assert.doesNotMatch(out, /style="width:273px/);
});
