import {
  CSSProperties,
  PropsWithChildren,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Key } from "./Key";

// Zoom level for the layout view: a number is an explicit scale factor, "auto"
// fits the layout to the available space.
export type LayoutZoom = number | "auto";

export type KeyPosition = PropsWithChildren<{
  id: string;
  header?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
}>;

interface PhysicalLayoutProps {
  positions: Array<KeyPosition>;
  selectedPosition?: number;
  /** Multi-select highlight (e.g. a key-position picker). A position is shown
   * selected if it is `selectedPosition` OR appears in `selectedPositions`. */
  selectedPositions?: Array<number>;
  oneU?: number;
  zoom?: LayoutZoom;
  onPositionClicked?: (position: number) => void;
  /** Surface treatment for unselected keys, forwarded to each `Key`. Use
   * `"preview"` for the small static visualizations (combo list) so the keys
   * stay legible against the panel. */
  keyVariant?: "default" | "preview";
}

interface PhysicalLayoutPositionLocation {
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
}

function scalePosition(
  { x, y, r, rx, ry }: PhysicalLayoutPositionLocation,
  oneU: number,
): CSSProperties {
  const left = x * oneU;
  const top = y * oneU;
  let transformOrigin = undefined;
  let transform = undefined;

  if (r) {
    const transformX = ((rx || x) - x) * oneU;
    const transformY = ((ry || y) - y) * oneU;
    transformOrigin = `${transformX}px ${transformY}px`;
    transform = `rotate(${r}deg)`;
  }

  return {
    top,
    left,
    transformOrigin,
    transform,
  };
}

export const PhysicalLayout = ({
  positions,
  selectedPosition,
  selectedPositions,
  oneU = 48,
  zoom,
  onPositionClicked,
  keyVariant = "default",
}: PhysicalLayoutProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // TODO: Add a bit of padding for rotation when supported
  const width =
    positions.map((k) => k.x + k.width).reduce((a, b) => Math.max(a, b), 0) *
    oneU;
  const height =
    positions.map((k) => k.y + k.height).reduce((a, b) => Math.max(a, b), 0) *
    oneU;

  // Without a click handler the layout is a static visualization (e.g. a combo
  // list preview): keys don't react to hover, aren't focusable, and don't lift.
  // Interactive layouts get the hover affordance: the key zooms (in Key) and
  // lifts forward so it sits above its neighbors rather than behind them.
  const interactive = !!onPositionClicked;

  // The fit is measured against our unzoomed size (`width`/`height`), not the
  // rendered element: CSS `zoom` scales the element's box for real, so reading
  // it back would feed the next measurement its own output.
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;

    const calculateScale = () => {
      if (zoom === "auto") {
        const padding = Math.min(window.innerWidth, window.innerHeight) * 0.05; // Padding when in auto mode
        const newScale = Math.min(
          parent.clientWidth / (width + 2 * padding),
          parent.clientHeight / (height + 2 * padding),
        );
        setScale(newScale);
      } else {
        setScale(zoom || 1);
      }
    };

    calculateScale(); // Initial calculation

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [zoom, width, height]);

  const positionItems = positions.map((p, idx) => (
    <div
      key={p.id}
      onClick={interactive ? () => onPositionClicked?.(idx) : undefined}
      className={
        "absolute" +
        // The hovered key zooms (in Key), so it has to rise above its
        // neighbors. `z-index` is animatable as an integer, so two keys
        // transitioning in opposite directions swap over at the midpoint of the
        // zoom rather than the moment the pointer moves — what lifting the key
        // through a 3D `translateZ` used to buy. Doing it flat keeps the keys
        // out of a 3D rendering context, which Gecko renders in its own local
        // raster space and composites as plane-split polygons: blurred legends,
        // unantialiased edges on the rotated keys, and neighbors visibly
        // re-rasterizing as soon as one key left the shared plane.
        // `z-0` matters: `z-index: auto` is a keyword, and would make the
        // transition discrete.
        (interactive
          ? " z-0 transition-[z-index] duration-200 hover:z-10"
          : "")
      }
      style={scalePosition(p, oneU)}
    >
      <Key
        oneU={oneU}
        interactive={interactive}
        variant={keyVariant}
        selected={idx === selectedPosition || !!selectedPositions?.includes(idx)}
        {...p}
      />
    </div>
  ));

  return (
    // The zoomed layer sits in a box of its unzoomed size: `zoom` takes up real
    // layout space where `transform: scale()` did not, and an auto-fit
    // measuring a parent that its own output had resized would feed on itself.
    // This keeps the footprint every caller has always laid out around.
    //
    // `zoom` grows the layer from its top-left, so the box is pulled back by
    // half the growth to keep it centered on that footprint — where
    // `transform: scale()` left it, its origin being the centre.
    <div
      className="relative"
      style={{
        height: height + "px",
        width: width + "px",
        transform: `translate(${(width * (1 - scale)) / 2}px, ${
          (height * (1 - scale)) / 2
        }px)`,
      }}
      ref={ref}
    >
      <div
        className="relative"
        style={{
          height: height + "px",
          width: width + "px",
          // `zoom`, not `transform: scale()`: it scales at layout time, so the
          // legends are laid out and rasterized at their final size instead of
          // being magnified from a 1x rendering.
          zoom: scale,
        }}
      >
        {positionItems}
      </div>
    </div>
  );
};
