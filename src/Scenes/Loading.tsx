import { FC, ReactNode, useEffect, useMemo, useRef } from "react";
import { SceneComponent } from "../Components/Babylon";
import { DebugLayer } from "../Helpers/DebugLayer";
import { useEngine, useScene } from "react-babylonjs";
import { Color4, Nullable, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";

interface Props {
  children?: ReactNode;
}

export const Loading: FC<Props> = () => {
  const clearColor = useMemo(() => new Color4(0, 0, 0, 1), []);
  return (
    <SceneComponent clearColor={clearColor}>
      <DebugLayer>
        <Stage />
      </DebugLayer>
    </SceneComponent>
  );
};

const cameraPos = new Vector3(0, 0, 0);

const Stage = () => {
  const scene = useScene();
  const engine = useEngine();

  useEffect(() => {
    if (!scene) return;
    if (!engine) return;

    const load = async () => {
      engine.displayLoadingUI();
      await scene.whenReadyAsync();
      engine.hideLoadingUI();
    };
    load();
  }, [scene, engine]);

  return <freeCamera name="Loading" position={cameraPos}></freeCamera>;
};
