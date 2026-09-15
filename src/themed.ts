import {
  transformSvg,
  type Diagnostic,
  type ThemedSvgManifest,
  type TransformOptions,
  type TransformResult,
} from '@dev-centr/themed-svg';
import { preparePlantumlSvgForWeb } from './prepare.js';

export type DualOutputKind = 'standalone-adaptive' | 'host';

export interface DualOutputDiagnostic extends Diagnostic {
  output: DualOutputKind;
}

export type DualOutputOptions = Omit<TransformOptions, 'mode'>;

export interface DualOutputResult {
  standaloneSvg?: string;
  hostSvg?: string;
  diagnostics: DualOutputDiagnostic[];
}

export interface PrepareThemedPlantumlOptions extends TransformOptions {
  /** Run webCompatibility normalize before Themed SVG transform (default true). */
  webCompatibility?: boolean;
}

/**
 * Seed `#themed-svg-bindings` with concrete light-preset declarations so
 * `@dev-centr/themed-svg` stylesheet bindings have rules to rewrite to `var()`.
 */
export function seedThemedBindingsStyle(
  svg: string,
  manifest: ThemedSvgManifest,
): string {
  const presetName = manifest.defaultPreset ?? 'light';
  const palette = manifest.presets[presetName] ?? {};
  const rules = manifest.bindings
    .filter((binding) => binding.kind === 'stylesheet')
    .map((binding) => {
      const fallback = palette[binding.token] ?? '#000000';
      return `${binding.selector}{${binding.property}:${fallback} !important}`;
    })
    .join('');
  if (!rules) return svg;

  if (/id=["']themed-svg-bindings["']/.test(svg)) {
    return svg.replace(
      /<style\b[^>]*id=["']themed-svg-bindings["'][^>]*>[\s\S]*?<\/style>/i,
      `<style id="themed-svg-bindings">${rules}</style>`,
    );
  }

  if (/<\/svg>/i.test(svg)) {
    return svg.replace(/<\/svg>/i, `<style id="themed-svg-bindings">${rules}</style></svg>`);
  }
  return `${svg}<style id="themed-svg-bindings">${rules}</style>`;
}

function prepareInput(
  svg: string,
  manifest: ThemedSvgManifest,
  webCompatibility = true,
): string {
  const normalized = webCompatibility === false ? svg : preparePlantumlSvgForWeb(svg);
  return seedThemedBindingsStyle(normalized, manifest);
}

/**
 * Apply the generator-neutral Themed SVG contract to PlantUML/Kroki SVG.
 */
export function prepareThemedPlantumlSvg(
  svg: string,
  manifest: ThemedSvgManifest,
  options: PrepareThemedPlantumlOptions = {},
): TransformResult {
  const { webCompatibility = true, ...transformOptions } = options;
  return transformSvg(prepareInput(svg, manifest, webCompatibility), manifest, transformOptions);
}

/**
 * Produce portable adaptive + host artifacts together.
 * Outputs are withheld unless both transformations succeed.
 */
export function prepareThemedPlantumlSvgDualOutput(
  svg: string,
  manifest: ThemedSvgManifest,
  options: DualOutputOptions & { webCompatibility?: boolean } = {},
): DualOutputResult {
  const { webCompatibility = true, ...dualOptions } = options;
  const prepared = prepareInput(svg, manifest, webCompatibility);
  const standalone = transformSvg(prepared, manifest, {
    ...dualOptions,
    mode: 'standalone-adaptive',
  });
  const host = transformSvg(prepared, manifest, { ...dualOptions, mode: 'host' });
  const diagnostics = [
    ...standalone.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      output: 'standalone-adaptive' as const,
    })),
    ...host.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      output: 'host' as const,
    })),
  ];
  const failed =
    diagnostics.some(({ severity }) => severity === 'error') ||
    standalone.svg === undefined ||
    host.svg === undefined;

  return failed
    ? { diagnostics }
    : {
        standaloneSvg: standalone.svg,
        hostSvg: host.svg,
        diagnostics,
      };
}

export type {
  Diagnostic,
  OutputMode,
  Palette,
  SvgBinding,
  ThemedSvgManifest,
  TransformOptions,
  TransformResult,
} from '@dev-centr/themed-svg';
