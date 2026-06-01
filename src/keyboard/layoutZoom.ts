// Zoom level for a physical-layout view. A number is an explicit scale factor;
// "auto" fits the layout to the available space. Kept separate from
// PhysicalLayout.tsx (a component module) so Vite Fast Refresh keeps working.

export type LayoutZoom = number | "auto";

export function deserializeLayoutZoom(value: string): LayoutZoom {
  if (value === "auto") {
    return "auto";
  }
  return parseFloat(value) || "auto";
}
