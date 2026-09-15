import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';

const cli = resolve('bin/plantuml-svg-css-vars.js');
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40" data-diagram-type="SEQUENCE"><rect class="participant" width="100" height="40" fill="#fff"/><text>Hi</text></svg>';

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'plantuml-svg-css-vars-'));
  const input = join(directory, 'diagram.svg');
  const manifest = join(directory, 'manifest.json');
  writeFileSync(input, svg, 'utf8');
  writeFileSync(
    manifest,
    JSON.stringify({
      schemaVersion: 1,
      namespace: 'diagram',
      source: { kind: 'plantuml', generator: 'kroki-plantuml' },
      tokens: [
        { id: 'color.canvas' },
        { id: 'color.surface.primary' },
        { id: 'color.surface.secondary' },
        { id: 'color.text.primary' },
        { id: 'color.border.primary' },
        { id: 'color.edge' },
      ],
      defaultPreset: 'light',
      presets: {
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
      },
      bindings: [
        {
          kind: 'stylesheet',
          selector: '.themed-svg-root .participant',
          property: 'fill',
          styleSelector: '#themed-svg-bindings',
          token: 'color.surface.primary',
        },
      ],
    }),
    'utf8',
  );
  return { directory, input, manifest };
}

function run(args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('manifest CLI route', () => {
  it('defaults to host output', () => {
    const { input, manifest } = fixture();
    const result = run(['--manifest', manifest, input]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /var\(--themed-svg-diagram-color-surface-primary/);
    assert.doesNotMatch(result.stdout, /prefers-color-scheme/);
  });

  it('writes dual adaptive and host outputs', () => {
    const { directory, input, manifest } = fixture();
    const adaptive = join(directory, 'out.svg');
    const host = join(directory, 'out.host.svg');
    const result = run([
      '--manifest',
      manifest,
      '--dual-output',
      '-o',
      adaptive,
      '--host-output',
      host,
      input,
    ]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      spawnSync(process.execPath, ['-e', `console.log(require('fs').readFileSync(${JSON.stringify(adaptive)},'utf8'))`], {
        encoding: 'utf8',
      }).stdout,
      /prefers-color-scheme:dark/,
    );
  });
});

describe('normalize-only route', () => {
  it('normalizes without a manifest', () => {
    const { input } = fixture();
    const result = run([input]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /width="100%"/);
    assert.match(result.stdout, /themed-svg-root/);
  });
});
