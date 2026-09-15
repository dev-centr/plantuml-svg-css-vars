import assert from 'node:assert/strict';
import { it } from 'node:test';
import {
  plantumlSequenceBindings,
  prepareThemedPlantumlSvg,
  prepareThemedPlantumlSvgDualOutput,
  type ThemedSvgManifest,
} from '../src/index.js';

const palettes = {
  light: {
    'color.canvas': '#f3f1ec',
    'color.surface.primary': '#ffffff',
    'color.surface.secondary': '#e8f0ea',
    'color.text.primary': '#1a1a1a',
    'color.border.primary': '#2c2c2c',
    'color.edge': '#2c2c2c',
    'color.status.warning': '#f7f3e8',
    'color.status.warning-border': '#6b5a3e',
  },
  dark: {
    'color.canvas': '#10161a',
    'color.surface.primary': '#182126',
    'color.surface.secondary': '#203038',
    'color.text.primary': '#edf4f2',
    'color.border.primary': '#78909b',
    'color.edge': '#a8bdc4',
    'color.status.warning': '#4a3e24',
    'color.status.warning-border': '#d5b866',
  },
};

it('adapts PlantUML sequence SVG through Themed SVG', () => {
  const manifest: ThemedSvgManifest = {
    schemaVersion: 1,
    namespace: 'diagram',
    source: { kind: 'plantuml', generator: 'kroki-plantuml' },
    tokens: Object.keys(palettes.light).map((id) => ({ id })),
    defaultPreset: 'light',
    presets: palettes,
    bindings: plantumlSequenceBindings(),
  };
  // Classes on parent <g>; paint on children (real Kroki shape).
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-diagram-type="SEQUENCE">' +
    '<g class="participant participant-head"><rect width="40" height="20" fill="#E2E2F0" style="stroke:#181818;stroke-width:0.5;"/></g>' +
    '<g class="participant participant-head">' +
    '<ellipse cx="20" cy="10" fill="#E2E2F0" rx="8" ry="8" style="stroke:#181818;stroke-width:0.5;"/>' +
    '<path d="M20,18 L20,40 M10,25 L30,25 M20,40 L10,55 M20,40 L30,55" fill="none" style="stroke:#181818;stroke-width:0.5;"/>' +
    '</g>' +
    '<g class="participant-lifeline"><line x1="20" x2="20" y1="20" y2="80" style="stroke:#2c2c2c;stroke-width:0.5;stroke-dasharray:5,5;"/></g>' +
    '<g class="message"><polygon fill="#2C2C2C" points="0,0 10,5 0,10" style="stroke:#2C2C2C;stroke-width:1;"/><line style="stroke:#2C2C2C;stroke-width:1;" x1="0" x2="40" y1="5" y2="5"/></g>' +
    '<path d="M10,50 L40,50 L40,70 L10,70 Z" fill="#FEFFDD" style="stroke:#181818;stroke-width:0.5;"/>' +
    '<rect fill="#EEEEEE" height="20" width="100" x="0" y="40" style="stroke:#000000;stroke-width:2;"/>' +
    '<text fill="#000000">Label</text></svg>';

  const host = prepareThemedPlantumlSvg(svg, manifest);
  assert.equal(host.diagnostics.filter((d) => d.severity === 'error').length, 0);
  assert.match(host.svg!, /var\(--themed-svg-diagram-color-surface-primary/);
  assert.match(host.svg!, /class="note"/);
  assert.match(host.svg!, /class="sequence-divider"/);
  assert.match(host.svg!, /class="actor"/);
  assert.match(host.svg!, /stroke:var\(--themed-svg-diagram-color-edge/);
  // Lifelines stay edge-bound; dashed lines must not become dividers.
  assert.doesNotMatch(
    host.svg!,
    /stroke-dasharray:5,5;[^"]*" class="sequence-divider"/,
  );
  assert.doesNotMatch(host.svg!, /prefers-color-scheme:dark/);

  const dual = prepareThemedPlantumlSvgDualOutput(svg, manifest);
  assert.equal(dual.diagnostics.filter((d) => d.severity === 'error').length, 0);
  assert.match(dual.standaloneSvg!, /prefers-color-scheme:dark/);
  assert.match(dual.hostSvg!, /var\(--themed-svg-diagram-color-edge/);
  assert.match(dual.hostSvg!, /var\(--themed-svg-diagram-color-status-warning/);
});

it('withholds dual outputs when transform fails', () => {
  const manifest: ThemedSvgManifest = {
    schemaVersion: 1,
    namespace: 'diagram',
    tokens: [{ id: 'color.surface.primary' }],
    defaultPreset: 'light',
    presets: {
      light: { 'color.surface.primary': '#fff' },
      dark: { 'color.surface.primary': '#000' },
    },
    bindings: [
      {
        kind: 'presentation',
        selector: '#missing',
        attribute: 'fill',
        token: 'color.surface.primary',
      },
    ],
  };
  const result = prepareThemedPlantumlSvgDualOutput(
    '<svg xmlns="http://www.w3.org/2000/svg"><rect id="other" fill="#fff"/></svg>',
    manifest,
  );
  assert.equal(result.standaloneSvg, undefined);
  assert.equal(result.hostSvg, undefined);
});
