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
  const transformStyle = "preserve-3d";

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
    transformStyle,
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

  // Without a click handler the layout is a static visualization (e.g. a combo
  // list preview): keys don't react to hover, aren't focusable, and don't lift.
  // Interactive layouts get the hover affordance: the key zooms (in Key) and
  // lifts forward so it sits above its neighbors rather than behind them.
  const interactive = !!onPositionClicked;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const parent = element.parentElement;
    if (!parent) return;

    const calculateScale = () => {
      if (zoom === "auto") {
        const padding = Math.min(window.innerWidth, window.innerHeight) * 0.05; // Padding when in auto mode
        const newScale = Math.min(
          parent.clientWidth / (element.clientWidth + 2 * padding),
          parent.clientHeight / (element.clientHeight + 2 * padding),
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

    resizeObserver.observe(element);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [zoom]);

  // TODO: Add a bit of padding for rotation when supported
  const rightMost = positions
    .map((k) => k.x + k.width)
    .reduce((a, b) => Math.max(a, b), 0);
  const bottomMost = positions
    .map((k) => k.y + k.height)
    .reduce((a, b) => Math.max(a, b), 0);

  const positionItems = positions.map((p, idx) => (
    <div className="absolute" style={scalePosition(p, oneU)}>
      <div
        key={p.id}
        onClick={interactive ? () => onPositionClicked?.(idx) : undefined}
        className={
          "[transform:translateZ(0)] [backface-visibility:hidden] transition-transform duration-200" +
          (interactive ? " hover:[transform:translateZ(100px)]" : "")
        }
      >
        <Key
          oneU={oneU}
          interactive={interactive}
          variant={keyVariant}
          selected={idx === selectedPosition || !!selectedPositions?.includes(idx)}
          {...p}
        />
      </div>
    </div>
  ));

  return (
    <div
      className="relative"
      style={{
        height: bottomMost * oneU + "px",
        width: rightMost * oneU + "px",
        transform: `scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
      ref={ref}
    >
      {positionItems}
    </div>
  );
};
