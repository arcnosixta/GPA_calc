import { useEffect, useRef } from "react";
import { gradePoints, type GpaHistoryPoint } from "./integration-adapter";

export const maxGpa = gradePoints.A;
export const gpaTicks = [maxGpa, 3, 2, 1, 0];
export const plotInset = 8;
export const gpaSeries = [
  { key: "semesterGpa", label: "GPA семестра", color: "#4f46c8", dashed: false },
  { key: "cumulativeGpa", label: "Накопительный GPA", color: "#087a69", dashed: true },
] as const;

type PlotPoint = { x: number; y: number };
type Series = (typeof gpaSeries)[number];

function drawSeries(
  context: CanvasRenderingContext2D,
  points: readonly (PlotPoint | null)[],
  series: Series,
  top: number,
  bottom: number,
) {
  const segments: PlotPoint[][] = [];
  let segment: PlotPoint[] = [];
  for (const point of points) {
    if (point) segment.push(point);
    else if (segment.length) {
      segments.push(segment);
      segment = [];
    }
  }
  if (segment.length) segments.push(segment);

  context.strokeStyle = series.color;
  context.lineWidth = 2.5;
  context.setLineDash(series.dashed ? [6, 5] : []);
  for (const segment of segments) {
    if (segment.length < 2) continue;
    const first = segment[0];
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of segment.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();

    if (!series.dashed) {
      const gradient = context.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(0, "#4f46c829");
      gradient.addColorStop(1, "#4f46c803");
      context.lineTo(segment.at(-1)!.x, bottom);
      context.lineTo(first.x, bottom);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
    }
  }
  context.setLineDash([]);
}

export function GpaHistoryPlot({ history, activeSemester }: {
  history: readonly GpaHistoryPoint[];
  activeSemester: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    function draw(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || height <= plotInset * 2) return;
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";

      const columnWidth = width / history.length;
      const top = plotInset;
      const bottom = height - plotInset;
      const x = (index: number) => (index + 0.5) * columnWidth;
      const y = (gpa: number) => bottom - (gpa / maxGpa) * (bottom - top);
      const activeIndex = history.findIndex(({ semester }) => semester === activeSemester);

      context.strokeStyle = "#e3e5ef";
      context.lineWidth = 1;
      for (const tick of gpaTicks) {
        context.beginPath();
        context.moveTo(0, y(tick));
        context.lineTo(width, y(tick));
        context.stroke();
      }

      if (activeIndex >= 0) {
        const center = x(activeIndex);
        const halfBand = Math.min(columnWidth * 0.4, 25);
        context.fillStyle = "#4f46c80d";
        context.fillRect(center - halfBand, top, halfBand * 2, bottom - top);
        context.strokeStyle = "#4f46c850";
        context.setLineDash([3, 4]);
        context.beginPath();
        context.moveTo(center, top);
        context.lineTo(center, bottom);
        context.stroke();
        context.setLineDash([]);
      }

      const plots = gpaSeries.map((series) => ({
        series,
        points: history.map((entry, index) => {
          const value = entry[series.key];
          return value === null ? null : { x: x(index), y: y(value) };
        }),
      }));
      for (const { series, points } of plots) drawSeries(context, points, series, top, bottom);

      // Paint the teal ring first so both series remain visible when their GPAs coincide.
      for (const { series, points } of [...plots].reverse()) {
        points.forEach((point, index) => {
          if (!point) return;
          const radius = (series.dashed ? 5.75 : 3.75) + (index === activeIndex ? 1 : 0);
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fillStyle = series.dashed ? "#ffffff" : series.color;
          context.strokeStyle = series.dashed ? series.color : "#ffffff";
          context.lineWidth = series.dashed ? 2 : 1.5;
          context.fill();
          context.stroke();
        });
      }
    }

    const render = () => draw(canvas, context);
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    render();
    return () => observer.disconnect();
  }, [activeSemester, history]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
