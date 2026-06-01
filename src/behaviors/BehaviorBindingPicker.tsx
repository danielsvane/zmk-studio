import { useEffect, useMemo, useRef, useState } from "react";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { useBehaviorParameters } from "./useBehaviorParameters";
import { validateValue } from "./parameters";
import { PickerShell } from "../misc/PickerShell";
import { Select } from "../misc/Select";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  const matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);

  const behavior = useMemo(
    () => behaviors.find((b) => b.id == behaviorId),
    [behaviorId, behaviors]
  );
  const metadata = behavior?.metadata;

  // Copy before sorting: `.sort()` mutates in place, and `behaviors` is a prop.
  // (`.toSorted()` would be cleaner but needs Safari 16; this build targets
  // Safari 13 — see vite.config.ts.)
  const sortedBehaviors = useMemo(
    () =>
      [...behaviors].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      ),
    [behaviors]
  );

  // This effect propagates *user edits* (local behaviorId/param1/param2) up via
  // onBindingChanged. The incoming `binding`, `metadata`, `layers`, and the
  // callback are consulted only at the moment of such an edit — they must not
  // themselves re-trigger it (the sibling sync-down effect already mirrors
  // `binding` into local state, and re-firing on metadata/callback changes can
  // loop). Read them through refs so the trigger stays the three edited values.
  const bindingRef = useRef(binding);
  bindingRef.current = binding;
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const onBindingChangedRef = useRef(onBindingChanged);
  onBindingChangedRef.current = onBindingChanged;

  useEffect(() => {
    const binding = bindingRef.current;
    if (
      binding.behaviorId === behaviorId &&
      binding.param1 === param1 &&
      binding.param2 === param2
    ) {
      return;
    }

    const metadata = metadataRef.current;
    if (!metadata) {
      console.error(
        "Can't find metadata for the selected behaviorId",
        behaviorId
      );
      return;
    }

    if (
      validateBinding(
        metadata,
        layersRef.current.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChangedRef.current({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [behaviorId, param1, param2]);

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  const { controls, canvas } = useBehaviorParameters({
    metadata,
    param1,
    param2,
    layers,
    onParam1Changed: setParam1,
    onParam2Changed: setParam2,
  });

  return (
    <PickerShell
      canvas={canvas}
      controls={
        <>
          <Select
            label="Behavior"
            items={sortedBehaviors}
            selectedKey={behaviorId}
            itemKey={(b) => b.id}
            itemText={(b) => b.displayName}
            onSelectionChange={(key) => {
              setBehaviorId(Number(key));
              setParam1(0);
              setParam2(0);
            }}
          />
          {controls}
        </>
      }
    />
  );
};
