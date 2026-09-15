import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
  classifyPlantumlSequencePaint,
  normalizePlantumlSvgForWeb,
} from '../src/normalize.js';

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

it('classifies stick-figure paints and skips dashed lifelines as dividers', () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg" data-diagram-type="SEQUENCE">' +
    '<ellipse cx="10" cy="10" fill="#E2E2F0" rx="8" ry="8" style="stroke:#181818;stroke-width:0.5;"/>' +
    '<path d="M10,18 L10,40 M5,25 L15,25 M10,40 L5,50 M10,40 L15,50" fill="none" style="stroke:#181818;stroke-width:0.5;"/>' +
    '<line style="stroke:#181818;stroke-width:0.5;stroke-dasharray:5,5;" x1="10" x2="10" y1="20" y2="80"/>' +
    '<line style="stroke:#000000;stroke-width:1;" x1="0" x2="40" y1="50" y2="50"/>' +
    '</svg>';
  const out = classifyPlantumlSequencePaint(input);
  assert.match(out, /ellipse[^>]*class="actor"/);
  assert.match(out, /path[^>]*class="actor"/);
  assert.match(out, /line[^>]*class="sequence-divider"/);
  assert.doesNotMatch(out, /stroke-dasharray:5,5;[^"]*" class="sequence-divider"/);
});
