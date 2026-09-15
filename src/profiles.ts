import type { SvgBinding } from '@dev-centr/themed-svg';

function sheet(
  selector: string,
  property: string,
  token: string,
): SvgBinding {
  return {
    kind: 'stylesheet',
    selector,
    property,
    styleSelector: '#themed-svg-bindings',
    token,
  };
}

/**
 * Structural bindings for PlantUML sequence diagrams (Kroki / PlantUML 1.202x SVG).
 */
export function plantumlSequenceBindings(): SvgBinding[] {
  return [
    sheet('.themed-svg-root', 'background-color', 'color.canvas'),
    sheet('.themed-svg-root text', 'fill', 'color.text.primary'),
    sheet('.themed-svg-root .participant', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .participant', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root .participant-head', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .participant-head', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root .participant-tail', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .participant-tail', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root .participant-lifeline line', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .message', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .message path', 'fill', 'color.edge'),
    sheet('.themed-svg-root .message path', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .note', 'fill', 'color.surface.secondary'),
    sheet('.themed-svg-root .note', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root marker path', 'fill', 'color.edge'),
    sheet('.themed-svg-root marker path', 'stroke', 'color.edge'),
  ];
}

/**
 * Structural bindings for PlantUML component / package / rectangle diagrams.
 */
export function plantumlComponentBindings(): SvgBinding[] {
  return [
    sheet('.themed-svg-root', 'background-color', 'color.canvas'),
    sheet('.themed-svg-root text', 'fill', 'color.text.primary'),
    sheet('.themed-svg-root .entity', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .entity', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root .cluster', 'fill', 'color.surface.secondary'),
    sheet('.themed-svg-root .cluster', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root .link', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .link path', 'fill', 'color.edge'),
    sheet('.themed-svg-root .link path', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .note', 'fill', 'color.surface.secondary'),
    sheet('.themed-svg-root .note', 'stroke', 'color.border.primary'),
    sheet('.themed-svg-root marker path', 'fill', 'color.edge'),
    sheet('.themed-svg-root marker path', 'stroke', 'color.edge'),
  ];
}

/**
 * Choose sequence vs component bindings from `data-diagram-type` when present.
 */
export function plantumlBindingsForSvg(svg: string): SvgBinding[] {
  if (/data-diagram-type="SEQUENCE"/i.test(svg)) return plantumlSequenceBindings();
  return plantumlComponentBindings();
}
