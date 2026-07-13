import "react";

declare global {
  interface Error {
    statusCode?: number;
    code?: string;
    details?: Array<Record<string, unknown>>;
  }
}

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export {};
