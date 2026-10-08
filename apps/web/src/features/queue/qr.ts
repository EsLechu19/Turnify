/**
 * Deterministic QR-looking matrix for the counter screen.
 *
 * It is a visual placeholder seeded by a hash, not a real QR payload: rendering
 * is done in CSS grid by the queue page, which imports the grid size from here.
 */

export const QR_CELLS = 21;

export function buildQrMatrix(seed: string): boolean[][] {
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const next = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return (hash >>> 0) / 4294967296;
  };

  const matrix = Array.from({ length: QR_CELLS }, () =>
    Array.from({ length: QR_CELLS }, () => next() > 0.52),
  );

  const finders: Array<[number, number]> = [
    [0, 0],
    [QR_CELLS - 7, 0],
    [0, QR_CELLS - 7],
  ];

  for (const [fx, fy] of finders) {
    for (let y = -1; y <= 7; y += 1) {
      for (let x = -1; x <= 7; x += 1) {
        const px = fx + x;
        const py = fy + y;

        if (px < 0 || py < 0 || px >= QR_CELLS || py >= QR_CELLS) {
          continue;
        }

        const insideFinder = x >= 0 && x <= 6 && y >= 0 && y <= 6;
        const inRing = x === 0 || x === 6 || y === 0 || y === 6;
        const inCore = x >= 2 && x <= 4 && y >= 2 && y <= 4;

        matrix[py][px] = insideFinder ? inRing || inCore : false;
      }
    }
  }

  for (let i = 8; i < QR_CELLS - 8; i += 1) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  return matrix;
}