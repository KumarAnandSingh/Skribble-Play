import { describe, expect, it } from "vitest";
import { interpolateStroke, simplifyStroke, type Stroke } from "./index";

describe("drawing-engine", () => {
  const baseStroke: Stroke = {
    id: "s1",
    color: "#fff",
    brushSize: 12,
    points: [
      { x: 0, y: 0, timestamp: 0 },
      { x: 10, y: 10, timestamp: 10 }
    ]
  };

  it("interpolates intermediate points", () => {
    const result = interpolateStroke(baseStroke, 4);
    expect(result.length).toBeGreaterThan(baseStroke.points.length);
    expect(result[0]).toEqual(baseStroke.points[0]);
    expect(result.at(-1)).toEqual(baseStroke.points.at(-1));
  });

  it("simplifies near-linear points", () => {
    const stroke: Stroke = {
      ...baseStroke,
      points: [
        { x: 0, y: 0, timestamp: 0 },
        { x: 1, y: 1, timestamp: 1 },
        { x: 2, y: 2, timestamp: 2 }
      ]
    };

    const simplified = simplifyStroke(stroke, 0.01);
    expect(simplified.points.length).toBeLessThanOrEqual(stroke.points.length);
  });
});
