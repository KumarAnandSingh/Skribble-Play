export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  t: number;
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  points: StrokePoint[];
}

export interface StrokeEvent {
  type: "stroke:start" | "stroke:move" | "stroke:end" | "stroke:undo";
  payload: Stroke;
}

export function interpolateStroke(stroke: Stroke, samples = 16): StrokePoint[] {
  if (stroke.points.length <= 1) return stroke.points;
  const interpolated: StrokePoint[] = [];

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const current = stroke.points[i];
    const next = stroke.points[i + 1];

    interpolated.push(current);

    for (let s = 1; s < samples; s++) {
      const ratio = s / samples;
      interpolated.push({
        x: current.x + (next.x - current.x) * ratio,
        y: current.y + (next.y - current.y) * ratio,
        pressure:
          current.pressure != null && next.pressure != null
            ? current.pressure + (next.pressure - current.pressure) * ratio
            : undefined,
        t: current.t + (next.t - current.t) * ratio,
      });
    }
  }

  interpolated.push(stroke.points.at(-1)!);
  return interpolated;
}
