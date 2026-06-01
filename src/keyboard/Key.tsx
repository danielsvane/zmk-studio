import { PropsWithChildren } from "react";
import BehaviorShortNames from "./behavior-short-names.json";
import { cx } from "../misc/controlStyles";

interface KeyProps {
  selected?: boolean;
  width: number;
  height: number;
  oneU: number;
  header?: string;
  onClick?: () => void;
  /** When false the key is a static visualization: rendered as a plain element
   * with no hover affordance and not focusable (e.g. a combo-list preview). */
  interactive?: boolean;
}

interface BehaviorShortName {
  short?: string;
}

const MAX_HEADER_LENGTH = 9;
const shortNames: Record<string, BehaviorShortName> = BehaviorShortNames;

const shortenHeader = (header: string | undefined) => {
  if(typeof header === "undefined"){
    return "";
  }
  // Empty string is a valid header for behaviors where we don't want to see a header, which is falsy
  // So we use an undefined check here
  if(typeof shortNames[header]?.short !== "undefined"){
    return shortNames[header].short;
  } else if(header.length > MAX_HEADER_LENGTH){
    const words = header.split(/[\s,-]+/);
    const lettersPerWord = Math.trunc(MAX_HEADER_LENGTH / words.length);
    return words.map((word) => (word.substring(0,lettersPerWord))).join("");
  } else {
    return header;
  }
}

export const Key = ({
  selected = false,
  width,
  height,
  oneU,
  header,
  onClick,
  interactive = true,
  children,
}: PropsWithChildren<KeyProps>) => {
  const pixelWidth = width * oneU - 2;
  const pixelHeight = height * oneU - 2;

  const label = shortenHeader(header);

  const className = cx(
    "group rounded relative flex justify-center items-center transition-all",
    interactive &&
      "cursor-pointer hover:shadow-xl hover:ring-1 hover:ring-gray-300 hover:scale-150",
    selected ? "bg-primary text-primary-content" : "bg-base-100 text-base-content",
  );

  const style = { width: `${pixelWidth}px`, height: `${pixelHeight}px` };

  const inner = (
    <>
      {label && (
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-2xs leading-none opacity-70 font-light text-nowrap text-center">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5 items-center scale-75 [&>*:nth-child(2)]:opacity-50">
        {children}
      </div>
    </>
  );

  // Static visualizations render as a plain div: no button semantics (so they
  // can sit inside another button, e.g. a combo-list card) and no focus stop.
  if (!interactive) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  return (
    <button className={className} style={style} onClick={onClick}>
      {inner}
    </button>
  );
};
