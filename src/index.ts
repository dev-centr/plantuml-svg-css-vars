export type { PreparePlantumlSvgOptions, WebCompatibilityOptions } from './types.js';

export {
  classifyPlantumlSequencePaint,
  normalizePlantumlSvgForWeb,
} from './normalize.js';
export { preparePlantumlSvgForWeb } from './prepare.js';
export {
  plantumlBindingsForSvg,
  plantumlComponentBindings,
  plantumlSequenceBindings,
} from './profiles.js';
export {
  prepareThemedPlantumlSvg,
  prepareThemedPlantumlSvgDualOutput,
  seedThemedBindingsStyle,
} from './themed.js';
export type {
  Diagnostic,
  DualOutputDiagnostic,
  DualOutputKind,
  DualOutputOptions,
  DualOutputResult,
  OutputMode,
  Palette,
  PrepareThemedPlantumlOptions,
  SvgBinding,
  ThemedSvgManifest,
  TransformOptions,
  TransformResult,
} from './themed.js';
