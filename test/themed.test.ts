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
  },
  dark: {
    'color.canvas': '#10161a',
    'color.surface.primary': '#182126',
    'color.surface.secondary': '#203038',
    'color.text.primary': '#edf4f2',
    'color.border.primary': '#78909b',
    'color.edge': '#a8bdc4',
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
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100" data-diagram-type="SEQUENCE"><rect class="participant participant-head" width="40" height="20" fill="#eee"/><line class="participant-lifeline" stroke="#000"/><path class="message" stroke="#111"/><text>Label</text></svg>';

  const host = prepareThemedPlantumlSvg(svg, manifest);
  assert.equal(host.diagnostics.filter((d) => d.severity === 'error').length, 0);
  assert.match(host.svg!, /var\(--themed-svg-diagram-color-surface-primary/);
  assert.doesNotMatch(host.svg!, /prefers-color-scheme:dark/);

  const dual = prepareThemedPlantumlSvgDualOutput(svg, manifest);
  assert.equal(dual.diagnostics.filter((d) => d.severity === 'error').length, 0);
  assert.match(dual.standaloneSvg!, /prefers-color-scheme:dark/);
  assert.match(dual.hostSvg!, /var\(--themed-svg-diagram-color-edge/);
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
