export interface WebCompatibilityOptions {
  /** Set root width to 100% (default true). */
  responsiveWidth?: boolean;
  /** Omit height so viewBox drives aspect (default true). */
  responsiveHeight?: boolean;
  /** Derive viewBox from numeric width/height when missing (default true). */
  ensureViewBox?: boolean;
  /** Strip opaque root backgrounds that fight host themes (default true). */
  stripBackground?: boolean;
  /** Set preserveAspectRatio when missing or replacing PlantUML `none` (default xMidYMid meet). */
  preserveAspectRatio?: string | false;
}

export interface PreparePlantumlSvgOptions {
  webCompatibility?: boolean | WebCompatibilityOptions;
}
