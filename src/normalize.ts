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

  return out;
}
