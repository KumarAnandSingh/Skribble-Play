"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Stroke, StrokePoint } from "@skribble-play/drawing-engine";
import { interpolateStroke } from "@skribble-play/drawing-engine";

export interface DrawingCanvasProps {
  playerId: string;
  onStroke: (stroke: Stroke) => void;
  remoteStrokes: Stroke[];
}

function createStroke(playerId: string, color: string, brushSize: number): Stroke {
  return {
    id: `${playerId}-${Date.now()}`,
    color,
    brushSize,
    points: []
  };
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  const { width, height } = context.canvas;
  const points = interpolateStroke(stroke, 16);
  if (points.length === 0) return;

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.brushSize;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();

  const start = points[0];
  context.moveTo(start.x * width, start.y * height);

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    context.lineTo(point.x * width, point.y * height);
  }

  context.stroke();
}

export function DrawingCanvas({ playerId, onStroke, remoteStrokes }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const strokeRef = useRef<Stroke | null>(null);

  const strokeColor = useMemo(() => "#8f47ff", []);
  const brushSize = 3;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio ?? 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    context.scale(dpr, dpr);
    context.fillStyle = "#0f1020";
    context.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#0f1020";
    context.fillRect(0, 0, width, height);

    remoteStrokes.forEach((stroke) => drawStroke(context, stroke));
  }, [remoteStrokes]);

  function pointerPoint(event: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      timestamp: Date.now(),
      pressure: event.pressure && event.pressure > 0 ? event.pressure : undefined
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const stroke = createStroke(playerId, strokeColor, brushSize);
    stroke.points.push(pointerPoint(event));
    strokeRef.current = stroke;
    setIsDrawing(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const stroke = strokeRef.current;
    const canvas = canvasRef.current;
    if (!stroke || !canvas) return;

    const point = pointerPoint(event);
    stroke.points.push(point);
    const context = canvas.getContext("2d");
    if (context && stroke.points.length > 1) {
      const prev = stroke.points[stroke.points.length - 2];
      const { width, height } = context.canvas;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.brushSize;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(prev.x * width, prev.y * height);
      context.lineTo(point.x * width, point.y * height);
      context.stroke();
    }
  }

  function finalizeStroke() {
    const stroke = strokeRef.current;
    if (!stroke) return;
    if (stroke.points.length > 1) {
      onStroke(stroke);
    }
    strokeRef.current = null;
    setIsDrawing(false);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.releasePointerCapture(event.pointerId);
    finalizeStroke();
  }

  function handlePointerLeave() {
    if (isDrawing) {
      finalizeStroke();
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-96 w-full touch-none rounded-2xl border border-white/10 bg-black/20"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
}
