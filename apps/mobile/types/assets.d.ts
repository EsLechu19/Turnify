/**
 * Ambient declarations for image imports.
 *
 * Metro resolves these paths while bundling, but TypeScript needs the same
 * declaration to check them on `tsc --noEmit`. Without this file a typo in an
 * asset path stays invisible until `expo start` fails to bundle.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}

declare module '*.gif' {
  const asset: number;
  export default asset;
}

declare module '*.webp' {
  const asset: number;
  export default asset;
}