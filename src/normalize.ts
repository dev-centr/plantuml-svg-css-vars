import type { WebCompatibilityOptions } from './types.js';

const DEFAULTS: Required<Omit<WebCompatibilityOptions, 'preserveAspectRatio'>> & {
  preserveAspectRatio: string | false;
} = {
  responsiveWidth: true,
  responsiveHeight: true,
  ensureViewBox: true,
  stripBackground: true,
  preserveAspectRatio: 'xMidYMid meet',
};

function findRootSvgOpenTag(svg: string): { start: number; end: number; tag: string } | null {
  const m = svg.match(/<svg\b[^>]*>/i);
  if (!m || m.index === undefined) return null;
  return { start: m.index, end: m.index + m[0].length, tag: m[0] };
}

function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? null;
}

function setAttr(tag: string, name: string, value: string): string {
  const re = new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i');
  if (re.test(tag)) return tag.replace(re, ` ${name}="${value}"`);
  return tag.replace(/>$/, ` ${name}="${value}">`);
}

function removeAttr(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i'), '');
}

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  return Number(m[1]);
}

/** Classic PlantUML note sticky fills (hex, any case). */
const NOTE_FILLS = new Set([
  '#feffdd',
  '#ffffcc',
  '#fbfb77',
  '#ffffaa',
  '#eee8aa',
  '#f5f5dc',
]);

/** PlantUML `== divider ==` bar fills. */
const DIVIDER_FILLS = new Set(['#eeeeee', '#e2e2e2', '#f0f0f0', '#dddddd']);

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function appendClass(attrs: string, className: string): string {
  if (new RegExp(`\\bclass\\s*=\\s*("[^"]*|\'[^\']*)\\b${className}\\b`, 'i').test(attrs)) {
    return attrs;
  }
  if (/\sclass\s*=\s*"/i.test(attrs)) {
    return attrs.replace(/\sclass\s*=\s*"/i, ` class="${className} `);
  }
  if (/\sclass\s*=\s*'/i.test(attrs)) {
    return attrs.replace(/\sclass\s*=\s*'/i, ` class='${className} `);
  }
  return `${attrs} class="${className}"`;
}

/**
 * PlantUML often omits semantic classes on note / divider / stickman paint nodes.
 * Tag them so sequence bindings can recolor in dark mode.
 */
export function classifyPlantumlSequencePaint(svg: string): string {
  let out = svg.replace(
    /<(path|rect|polygon)\b([^>]*?)(\/?)>/gi,
    (full, tag: string, attrs: string, selfClose: string) => {
      const fill = normalizeHexColor(getAttr(`<x${attrs}>`, 'fill'));
      if (!fill) return full;
      let next = attrs;
      if (NOTE_FILLS.has(fill)) next = appendClass(next, 'note');
      else if (DIVIDER_FILLS.has(fill)) next = appendClass(next, 'sequence-divider');
      else return full;
      return `<${tag}${next}${selfClose}>`;
    },
  );

  // Stick-figure limbs: fill="none" path with body-outline stroke under a
  // participant head. Tag as `actor` so edge bindings apply even if a future
  // PlantUML build drops the parent participant class on the path.
  out = out.replace(/<path\b([^>]*?)(\/?)>/gi, (full, attrs: string, selfClose: string) => {
    if (/\bclass\s*=/i.test(attrs)) return full;
    const fill = (getAttr(`<x${attrs}>`, 'fill') ?? '').trim().toLowerCase();
    if (fill !== 'none') return full;
    const style = getAttr(`<x${attrs}>`, 'style') ?? '';
    const strokeAttr = normalizeHexColor(getAttr(`<x${attrs}>`, 'stroke'));
    const strokeStyle = normalizeHexColor(
      style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i)?.[1]?.trim() ?? null,
    );
    const stroke = strokeAttr ?? strokeStyle;
    if (stroke !== '#000000' && stroke !== '#181818' && stroke !== '#2c2c2c') return full;
    // Stick limbs are polylines (M…L…M…); skip filled arrow-like paths.
    const d = (getAttr(`<x${attrs}>`, 'd') ?? '').replace(/\s+/g, '');
    if (!/^M/i.test(d) || !/L/i.test(d) || (d.match(/M/gi) ?? []).length < 2) return full;
    return `<path${appendClass(attrs, 'actor')}${selfClose}>`;
  });

  out = out.replace(/<ellipse\b([^>]*?)(\/?)>/gi, (full, attrs: string, selfClose: string) => {
    if (/\bclass\s*=/i.test(attrs)) return full;
    const fill = normalizeHexColor(getAttr(`<x${attrs}>`, 'fill'));
    // Classic PlantUML actor/participant head fill.
    if (fill !== '#e2e2f0' && fill !== '#eeeeee' && fill !== '#ffffff') return full;
    return `<ellipse${appendClass(attrs, 'actor')}${selfClose}>`;
  });

  // `== title ==` separators are often bare <line stroke=#000> pairs.
  // Skip dashed lifelines (stroke-dasharray) — those are not dividers.
  out = out.replace(/<line\b([^>]*?)(\/?)>/gi, (full, attrs: string, selfClose: string) => {
    if (/\bclass\s*=/i.test(attrs)) return full;
    const style = getAttr(`<x${attrs}>`, 'style') ?? '';
    if (/stroke-dasharray\s*:/i.test(style) || /\bstroke-dasharray\s*=/i.test(attrs)) {
      return full;
    }
    const strokeAttr = normalizeHexColor(getAttr(`<x${attrs}>`, 'stroke'));
    const strokeStyle = normalizeHexColor(
      style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i)?.[1]?.trim() ?? null,
    );
    const stroke = strokeAttr ?? strokeStyle;
    if (stroke !== '#000000' && stroke !== '#181818') return full;
    return `<line${appendClass(attrs, 'sequence-divider')}${selfClose}>`;
  });

  return out;
}

/**
 * Normalize PlantUML/Kroki SVG for responsive web embedding.
 */
export function normalizePlantumlSvgForWeb(
  svg: string,
  options: WebCompatibilityOptions = {},
): string {
  const opts = { ...DEFAULTS, ...options };
  const root = findRootSvgOpenTag(svg);
  if (!root) return svg;

  let tag = root.tag;
  let body = svg.slice(0, root.start) + 'SVG_OPEN' + svg.slice(root.end);

  const widthAttr = getAttr(tag, 'width');
  const heightAttr = getAttr(tag, 'height');
  const viewBoxAttr = getAttr(tag, 'viewBox') ?? getAttr(tag, 'viewbox');

  if (opts.ensureViewBox && !viewBoxAttr) {
    const w = parseLength(widthAttr);
    const h = parseLength(heightAttr);
    if (w !== null && h !== null && w > 0 && h > 0) {
      tag = setAttr(tag, 'viewBox', `0 0 ${w} ${h}`);
    }
  }

  if (opts.responsiveWidth) tag = setAttr(tag, 'width', '100%');
  if (opts.responsiveHeight) tag = removeAttr(tag, 'height');

  if (opts.preserveAspectRatio !== false) {
    const current = getAttr(tag, 'preserveAspectRatio');
    if (!current || current === 'none') {
      tag = setAttr(tag, 'preserveAspectRatio', opts.preserveAspectRatio);
    }
  }

  // Drop fixed px sizing on style that fights responsive width.
  const style = getAttr(tag, 'style');
  if (style) {
    const cleaned = style
      .replace(/(?:^|;)\s*width\s*:\s*[^;]+/gi, '')
      .replace(/(?:^|;)\s*height\s*:\s*[^;]+/gi, '')
      .replace(/^;+|;+$/g, '')
      .trim();
    tag = cleaned ? setAttr(tag, 'style', cleaned) : removeAttr(tag, 'style');
  }

  let out = body.replace('SVG_OPEN', tag);

  if (opts.stripBackground) {
    out = out.replace(
      /(?:^|[^{};])\s*(?:svg)\s*\{[^}]*\bbackground(?:-color)?\s*:\s*[^;}"']+;?[^}]*\}/gi,
      (block) => block.replace(/\bbackground(?:-color)?\s*:\s*[^;}"']+;?/gi, ''),
    );
    const root2 = findRootSvgOpenTag(out);
    if (root2) {
      const rootStyle = getAttr(root2.tag, 'style');
      if (rootStyle && /background/i.test(rootStyle)) {
        const cleaned = rootStyle
          .replace(/(?:^|;)\s*background(?:-color)?\s*:\s*[^;]+/gi, '')
          .replace(/^;+|;+$/g, '')
          .trim();
        const t = cleaned
          ? setAttr(root2.tag, 'style', cleaned)
          : removeAttr(root2.tag, 'style');
        out = out.slice(0, root2.start) + t + out.slice(root2.end);
      }
    }
  }

  if (!/\sclass="/i.test(findRootSvgOpenTag(out)?.tag ?? '')) {
    const root3 = findRootSvgOpenTag(out);
    if (root3) {
      const withClass = setAttr(root3.tag, 'class', 'themed-svg-root');
      out = out.slice(0, root3.start) + withClass + out.slice(root3.end);
    }
  } else {
    out = out.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
      if (/\bthemed-svg-root\b/.test(attrs)) return `<svg${attrs}>`;
      if (/\sclass="/i.test(attrs)) {
        return `<svg${attrs.replace(/\sclass="([^"]*)"/i, ' class="$1 themed-svg-root"')}>`;
      }
      return `<svg${attrs} class="themed-svg-root">`;
    });
  }

  if (!/\srole="/i.test(findRootSvgOpenTag(out)?.tag ?? '')) {
    const root4 = findRootSvgOpenTag(out);
    if (root4) {
      out =
        out.slice(0, root4.start) +
        setAttr(root4.tag, 'role', 'img') +
        out.slice(root4.end);
    }
  }

  return classifyPlantumlSequencePaint(out);
}
