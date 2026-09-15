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
 *
 * PlantUML puts `participant` / `message` classes on parent `<g>` nodes while
 * paints live on child `rect` / `ellipse` / `path` / `line` / `polygon` with
 * presentation attributes. Bind the painted descendants so stylesheet
 * `!important` rules (and inline stroke sync) beat those attributes.
 */
export function plantumlSequenceBindings(): SvgBinding[] {
  return [
    sheet('.themed-svg-root', 'background-color', 'color.canvas'),
    sheet('.themed-svg-root text', 'fill', 'color.text.primary'),

    sheet('.themed-svg-root .participant rect', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .participant rect', 'stroke', 'color.border.primary'),

    // Stick-figure actors (`actor` → ellipse head + path limbs). Use edge, not
    // border: host dark themes often set border to near-invisible hairlines.
    sheet('.themed-svg-root .participant ellipse', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .participant ellipse', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .participant path', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .actor ellipse', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .actor ellipse', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .actor path', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .actor line', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .actor circle', 'fill', 'color.surface.primary'),
    sheet('.themed-svg-root .actor circle', 'stroke', 'color.edge'),

    sheet('.themed-svg-root .participant-lifeline line', 'stroke', 'color.edge'),

    sheet('.themed-svg-root .message line', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .message polygon', 'fill', 'color.edge'),
    sheet('.themed-svg-root .message polygon', 'stroke', 'color.edge'),
    sheet('.themed-svg-root .message path', 'fill', 'color.edge'),
    sheet('.themed-svg-root .message path', 'stroke', 'color.edge'),

    sheet('.themed-svg-root .note', 'fill', 'color.status.warning'),
    sheet('.themed-svg-root .note', 'stroke', 'color.status.warning-border'),

    sheet('.themed-svg-root .sequence-divider', 'fill', 'color.surface.secondary'),
    sheet('.themed-svg-root .sequence-divider', 'stroke', 'color.border.primary'),

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
