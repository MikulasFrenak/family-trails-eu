export interface PieSegment {
  color: string;
  count: number;
}

export function buildClusterPieIcon(segments: PieSegment[], size: number): string {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0) || 1;
  const radius = size / 2 - 2;
  const center = size / 2;
  const innerRadius = radius * 0.55;

  let slices: string;
  if (segments.length <= 1) {
    slices = `<circle cx="${center}" cy="${center}" r="${radius}" fill="${segments[0]?.color ?? "#144a34"}" />`;
  } else {
    let cumulative = 0;
    slices = segments
      .map(({ color, count }) => {
        const startAngle = (cumulative / total) * 2 * Math.PI;
        cumulative += count;
        const endAngle = (cumulative / total) * 2 * Math.PI;
        const x1 = center + radius * Math.sin(startAngle);
        const y1 = center - radius * Math.cos(startAngle);
        const x2 = center + radius * Math.sin(endAngle);
        const y2 = center - radius * Math.cos(endAngle);
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        return `<path d="M${center},${center} L${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}" />`;
      })
      .join("");
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    slices +
    `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#ffffff" stroke-width="2" />` +
    `<circle cx="${center}" cy="${center}" r="${innerRadius}" fill="#ffffff" />` +
    `</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
