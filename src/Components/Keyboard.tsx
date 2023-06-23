import { ActionManager, ExecuteCodeAction, Nullable, Scalar } from "@babylonjs/core";
import { Signal, signal, useSignal } from "@preact/signals-react";
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

interface IStates {
  vertical: Signal<number>;
  verticalAxis: Signal<number>;
  horizontal: Signal<number>;
  horizontalAxis: Signal<number>;
  dashing: Signal<boolean>;
  jumpKeyDown: Signal<boolean>;
}

interface IContext {
  Context: React.Context<Nullable<IStates>>;
}

export const Keyboard: FC<Props> & IContext = function ({ children }) {
  const scene = useScene();
  const keyMap = useMemo(() => new Map<string, boolean>(), []);

  const vertical = useSignal(0);
  const verticalAxis = useSignal(0);
  const horizontal = useSignal(0);
  const horizontalAxis = useSignal(0);
  const dashing = useSignal(false);
  const jumpKeyDown = useSignal(false);

  
  const keyDown = useMemo(
    () =>
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
        const isKeydown = evt.sourceEvent.type === "keydown";
        keyMap.set(evt.sourceEvent.key, isKeydown);
        console.log("[keydown]", `"${evt.sourceEvent.key}"`);
      }),
    []
  );
  const keyUp = useMemo(
    () =>
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
        const isKeydown = evt.sourceEvent.type === "keydown";
        keyMap.set(evt.sourceEvent.key, isKeydown);
        console.log("[keyup]", `"${evt.sourceEvent.key}"`);
      }),
    []
  );

  useMemo(() => {
    if (!scene) return;
    const am = new ActionManager(scene);
    am.registerAction(keyDown);
    am.registerAction(keyUp);
    scene.actionManager = am;
    return am;
  }, [scene]);

  const updateFromKeybaord = useCallback(() => {
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
      jumpKeyDown.value = true;
    } else {
      jumpKeyDown.value = false;
    }
  }, [keyMap, horizontal, vertical, dashing, jumpKeyDown]);


  useBeforeRender(() => {
    updateFromKeybaord();
  });

  return (
    <Keyboard.Context.Provider
      value={{
        vertical: vertical,
        verticalAxis: verticalAxis,
        horizontal: horizontal,
        horizontalAxis: horizontalAxis,
        dashing: dashing,
        jumpKeyDown: jumpKeyDown,
      }}
    >
      {children}
    </Keyboard.Context.Provider>
  );
};

Keyboard.Context = createContext(null);
