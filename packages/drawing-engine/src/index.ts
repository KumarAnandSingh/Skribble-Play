export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  color: string;
  brushSize: number;
  points: StrokePoint[];
}

export type StrokeEventType = "stroke:start" | "stroke:move" | "stroke:end" | "stroke:undo";

export interface StrokeEvent {
  type: StrokeEventType;
  payload: Stroke;
}

export function interpolateStroke(stroke: Stroke, samples = 12): StrokePoint[] {
  if (stroke.points.length < 2) {
    return stroke.points;
  }

  const result: StrokePoint[] = [];

  for (let index = 0; index < stroke.points.length - 1; index += 1) {
    const current = stroke.points[index];
    const next = stroke.points[index + 1];
    result.push(current);

    for (let step = 1; step < samples; step += 1) {
      const ratio = step / samples;
      result.push({
        x: current.x + (next.x - current.x) * ratio,
        y: current.y + (next.y - current.y) * ratio,
        pressure:
          current.pressure != null && next.pressure != null
            ? current.pressure + (next.pressure - current.pressure) * ratio
            : undefined,
        timestamp: current.timestamp + (next.timestamp - current.timestamp) * ratio
      });
    }
  }

  result.push(stroke.points.at(-1)!);
  return result;
}

export function simplifyStroke(stroke: Stroke, tolerance = 0.002): Stroke {
  if (stroke.points.length < 3) {
    return stroke;
  }

  const simplified = stroke.points.filter((point, index, array) => {
    if (index === 0 || index === array.length - 1) return true;
    const prev = array[index - 1];
    const next = array[index + 1];
    const area = Math.abs(prev.x * (point.y - next.y) + point.x * (next.y - prev.y) + next.x * (prev.y - point.y));
    return area > tolerance;
  });

  return {
    ...stroke,
    points: simplified
  };
}
