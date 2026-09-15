import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { preparePlantumlSvgForWeb } from './prepare.js';
import {
  prepareThemedPlantumlSvg,
  prepareThemedPlantumlSvgDualOutput,
} from './themed.js';
import type {
  OutputMode,
  Palette,
  ThemedSvgManifest,
  TransformOptions,
} from './themed.js';

function printHelp(): void {
  process.stdout.write(`Usage: plantuml-svg-css-vars [options] <input.svg>

Post-process PlantUML/Kroki SVG through a Themed SVG manifest, or normalize
for web embedding only.

Options:
  -o, --output <file>         Write result to file (default: stdout)
  --manifest <file>           Themed SVG version 1 explicit-binding manifest
  --mode <mode>               host (default), standalone-adaptive, fixed,
                              or paired-fixed
  --dual-output               Write adaptive and host outputs together
  --preset <name>             Manifest preset for fixed/host fallback
  --palette <file>            Shared runtime JSON palette
  --light-palette <file>      Runtime light-mode JSON palette
  --dark-palette <file>       Runtime dark-mode JSON palette
  --host-output <file>        dual host output path
  --light-output <file>       paired-fixed light output path
  --dark-output <file>        paired-fixed dark output path
  --check                     Verify dual outputs without rewriting them
  --no-web-compatibility      Skip responsive SVG normalization
  -h, --help                  Show help

Examples:
  plantuml-svg-css-vars --manifest diagram.theme.json diagram.svg -o diagram.themed.svg
  plantuml-svg-css-vars --manifest diagram.theme.json --dual-output diagram.raw.svg
  plantuml-svg-css-vars --manifest diagram.theme.json --dual-output --check diagram.raw.svg
  plantuml-svg-css-vars diagram.svg -o diagram.normalized.svg
`);
}

function parseArgs(argv: string[]) {
  const args = {
    input: '' as string,
    output: '' as string,
    manifestPath: '' as string,
    mode: 'host' as string,
    preset: '' as string,
    palettePath: '' as string,
    lightPalettePath: '' as string,
    darkPalettePath: '' as string,
    dualOutput: false,
    hostOutput: '' as string,
    lightOutput: '' as string,
    darkOutput: '' as string,
    check: false,
    webCompatibility: true,
    help: false,
    genericFlags: [] as string[],
  };

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const value = (): string => {
      const next = argv[++i];
      if (!next || next.startsWith('-')) throw new Error(`${a} requires a value`);
      return next;
    };
    switch (a) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-o':
      case '--output':
        args.output = value();
        break;
      case '--manifest':
        args.manifestPath = value();
        break;
      case '--mode':
        args.mode = value();
        args.genericFlags.push(a);
        break;
      case '--dual-output':
        args.dualOutput = true;
        args.genericFlags.push(a);
        break;
      case '--preset':
        args.preset = value();
        args.genericFlags.push(a);
        break;
      case '--palette':
        args.palettePath = value();
        args.genericFlags.push(a);
        break;
      case '--light-palette':
        args.lightPalettePath = value();
        args.genericFlags.push(a);
        break;
      case '--dark-palette':
        args.darkPalettePath = value();
        args.genericFlags.push(a);
        break;
      case '--host-output':
        args.hostOutput = value();
        args.genericFlags.push(a);
        break;
      case '--light-output':
        args.lightOutput = value();
        args.genericFlags.push(a);
        break;
      case '--dark-output':
        args.darkOutput = value();
        args.genericFlags.push(a);
        break;
      case '--check':
        args.check = true;
        args.genericFlags.push(a);
        break;
      case '--no-web-compatibility':
        args.webCompatibility = false;
        break;
      default:
        if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
        positional.push(a);
    }
  }

  if (!args.help && positional.length !== 1) {
    throw new Error('Exactly one input SVG must be supplied.');
  }
  args.input = positional[0] ?? '';
  return args;
}

function readPalette(path: string): Palette | undefined {
  return path ? (JSON.parse(readFileSync(path, 'utf8')) as Palette) : undefined;
}

function pairedName(input: string, variant: 'light' | 'dark'): string {
  const extension = extname(input);
  return join(dirname(input), `${basename(input, extension)}.${variant}${extension || '.svg'}`);
}

function deliveryName(input: string, host: boolean): string {
  const extension = extname(input);
  const stem = basename(input, extension).replace(/\.raw$/i, '');
  return join(dirname(input), `${stem}${host ? '.host' : ''}${extension || '.svg'}`);
}

function runManifestRoute(args: ReturnType<typeof parseArgs>): number {
  if (args.mode === 'dual') args.dualOutput = true;
  const modes: Array<OutputMode | 'dual'> = [
    'fixed',
    'standalone-adaptive',
    'host',
    'paired-fixed',
    'dual',
  ];
  if (!modes.includes(args.mode as OutputMode)) {
    throw new Error(`Unknown mode: ${args.mode}`);
  }
  if (
    (args.mode !== 'paired-fixed' || args.dualOutput) &&
    (args.lightOutput || args.darkOutput)
  ) {
    throw new Error('--light-output and --dark-output require --mode paired-fixed');
  }
  if (!args.dualOutput && args.hostOutput) {
    throw new Error('--host-output requires --dual-output');
  }
  if (!args.dualOutput && args.check) {
    throw new Error('--check requires --dual-output');
  }
  if (args.dualOutput && args.mode !== 'host' && args.mode !== 'dual') {
    throw new Error('--dual-output cannot be combined with --mode');
  }

  const svg = readFileSync(args.input, 'utf8');
  const manifest = JSON.parse(readFileSync(args.manifestPath, 'utf8')) as ThemedSvgManifest;
  const options: TransformOptions & { webCompatibility?: boolean } = {
    mode: args.mode === 'dual' ? 'host' : (args.mode as OutputMode),
    webCompatibility: args.webCompatibility,
  };
  if (args.preset) options.preset = args.preset;
  const palette = readPalette(args.palettePath);
  const lightPalette = readPalette(args.lightPalettePath);
  const darkPalette = readPalette(args.darkPalettePath);
  if (palette) options.palette = palette;
  if (lightPalette) options.lightPalette = lightPalette;
  if (darkPalette) options.darkPalette = darkPalette;

  if (args.dualOutput) {
    const { mode: _mode, ...dualOptions } = options;
    const result = prepareThemedPlantumlSvgDualOutput(svg, manifest, dualOptions);
    for (const diagnostic of result.diagnostics) {
      process.stderr.write(
        `${diagnostic.output}: ${diagnostic.severity}: ${diagnostic.code}: ${diagnostic.message}\n`,
      );
    }
    if (
      result.diagnostics.some(({ severity }) => severity === 'error') ||
      result.standaloneSvg === undefined ||
      result.hostSvg === undefined
    ) {
      return 2;
    }
    const adaptiveOutput = args.output || deliveryName(args.input, false);
    const hostOutput = args.hostOutput || deliveryName(args.input, true);
    if (resolve(adaptiveOutput) === resolve(hostOutput)) {
      throw new Error('dual output paths must be different');
    }
    if (args.check) {
      const stale = [
        [adaptiveOutput, result.standaloneSvg],
        [hostOutput, result.hostSvg],
      ].filter(
        ([path, expected]) => !existsSync(path!) || readFileSync(path!, 'utf8') !== expected,
      );
      if (stale.length > 0) {
        for (const [path] of stale) process.stderr.write(`stale: ${path}\n`);
        return 3;
      }
    } else {
      writeFileSync(adaptiveOutput, result.standaloneSvg, 'utf8');
      writeFileSync(hostOutput, result.hostSvg, 'utf8');
    }
    return 0;
  }

  const result = prepareThemedPlantumlSvg(svg, manifest, options);
  for (const diagnostic of result.diagnostics) {
    process.stderr.write(`${diagnostic.severity}: ${diagnostic.code}: ${diagnostic.message}\n`);
  }
  if (result.diagnostics.some(({ severity }) => severity === 'error')) return 2;

  if (args.mode === 'paired-fixed') {
    if (result.lightSvg === undefined || result.darkSvg === undefined) {
      throw new Error('paired-fixed transformation produced no paired output');
    }
    writeFileSync(args.lightOutput || pairedName(args.input, 'light'), result.lightSvg, 'utf8');
    writeFileSync(args.darkOutput || pairedName(args.input, 'dark'), result.darkSvg, 'utf8');
  } else {
    if (result.svg === undefined) throw new Error('Themed SVG transformation produced no output');
    if (args.output) writeFileSync(args.output, result.svg, 'utf8');
    else process.stdout.write(result.svg);
  }
  return 0;
}

export function runCli(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  if (args.genericFlags.length > 0 && !args.manifestPath) {
    throw new Error(`${args.genericFlags[0]} requires --manifest`);
  }
  if (args.manifestPath) return runManifestRoute(args);

  const svg = readFileSync(args.input, 'utf8');
  const out = preparePlantumlSvgForWeb(svg, {
    webCompatibility: args.webCompatibility,
  });
  if (args.output) writeFileSync(args.output, out, 'utf8');
  else process.stdout.write(out);
  return 0;
}
