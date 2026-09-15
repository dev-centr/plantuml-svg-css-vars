import { normalizePlantumlSvgForWeb } from './normalize.js';
import type { PreparePlantumlSvgOptions, WebCompatibilityOptions } from './types.js';

/**
 * Normalize PlantUML/Kroki SVG for web embedding (no color rewrite).
 * Theme tokens come from Themed SVG manifests via prepareThemedPlantumlSvg*.
 */
export function preparePlantumlSvgForWeb(
  svg: string,
  options: PreparePlantumlSvgOptions = {},
): string {
  if (options.webCompatibility === false) return svg;
  const webOptions: WebCompatibilityOptions =
    typeof options.webCompatibility === 'object' ? options.webCompatibility : {};
  return normalizePlantumlSvgForWeb(svg, webOptions);
}
