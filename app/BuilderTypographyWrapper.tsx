import type { CSSProperties, ReactNode } from "react";
import type { SiteBuilderState } from "./lib/site-builder";
import "./builder-typography.css";

type ExtendedTheme = SiteBuilderState["theme"] & {
  bodyFontSize?: number;
  bodyFontWeight?: number;
  bodyItalic?: boolean;
  bodyLetterSpacing?: number;
  headingItalic?: boolean;
};

export function BuilderTypographyWrapper({ state, children }: { state: SiteBuilderState; children: ReactNode }) {
  const theme = state.theme as ExtendedTheme;
  const vars = {
    "--builder-body-size": `${theme.bodyFontSize ?? 16}px`,
    "--builder-body-weight": String(theme.bodyFontWeight ?? 400),
    "--builder-body-style": theme.bodyItalic ? "italic" : "normal",
    "--builder-body-tracking": `${theme.bodyLetterSpacing ?? 0}em`,
    "--builder-heading-style": theme.headingItalic ? "italic" : "normal",
  } as CSSProperties;
  return <div className="builder-type-scope" style={vars}>{children}</div>;
}
