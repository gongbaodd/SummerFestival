import { ActionManager, ExecuteCodeAction, Scalar } from "@babylonjs/core";
import { signal, useSignal } from "@preact/signals-react";
import React, {
  FC,
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useBeforeRender, useScene } from "react-babylonjs";

interface Props {
  children: React.ReactNode;
}

const INIT_STATES = {
  vertical: 0,
  verticalAxis: 0,
  horizontal: 0,
  horizontalAxis: 0,
  dashing: false,
  jumKeyDown: false,
};

interface IContext {
  Context: React.Context<typeof INIT_STATES>;
}

export const Keyboard: FC<Props> & IContext = function ({ children }) {
  const scene = useScene();
  const keyMap = useMemo(() => new Map<string, boolean>(), []);

  const vertical = useSignal(0);
  const verticalAxis = useSignal(0);
  const horizontal = useSignal(0);
  const horizontalAxis = useSignal(0);
  const dashing = useSignal(false);
  const jumKeyDown = useSignal(false);

  useMemo(() => {
    if (!scene) return;
    const am = new ActionManager(scene);
    am.registerAction(keyDown);
    am.registerAction(keyUp);
    return am;
  }, [scene]);

  const updateFromKeybaord = () => {
    if (keyMap.get("ArrowUp")) {
      vertical.value = Scalar.Lerp(vertical.value, 1, 0.2);
      verticalAxis.value = 1;
    } else if (keyMap.get("ArrowDown")) {
      vertical.value = Scalar.Lerp(vertical.value, -1, 0.2);
      verticalAxis.value = -1;
    } else {
      vertical.value = 0;
      verticalAxis.value = 0;
    }

    if (keyMap.get("ArrowLeft")) {
      horizontal.value = Scalar.Lerp(horizontal.value, -1, 0.2);
      horizontalAxis.value = -1;
    } else if (keyMap.get("ArrowRight")) {
      horizontal.value = Scalar.Lerp(horizontal.value, 1, 0.2);
      horizontalAxis.value = 1;
    } else {
      horizontal.value = 0;
      horizontalAxis.value = 0;
    }

    if (keyMap.get("Shift")) {
      dashing.value = true;
    } else {
      dashing.value = false;
    }

    if (keyMap.get(" ")) {
      jumKeyDown.value = true;
    } else {
      jumKeyDown.value = false;
    }
  };

  const keyDown = useMemo(
    () =>
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
        keyMap.set(evt.sourceEvent.key, evt.sourceEvent.type === "keydown");
      }),
    []
  );
  const keyUp = useMemo(
    () =>
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
        keyMap.set(evt.sourceEvent.key, evt.sourceEvent.type === "keydown");
      }),
    []
  );

  useBeforeRender(() => {
    updateFromKeybaord();
  });

  return (
    <Keyboard.Context.Provider
      value={{
        vertical: vertical.value,
        verticalAxis: verticalAxis.value,
        horizontal: horizontal.value,
        horizontalAxis: horizontalAxis.value,
        dashing: dashing.value,
        jumKeyDown: jumKeyDown.value,
      }}
    >
      {children}
    </Keyboard.Context.Provider>
  );
};

Keyboard.Context = createContext(INIT_STATES);
