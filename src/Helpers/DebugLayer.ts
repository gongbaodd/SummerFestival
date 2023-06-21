import { FC, ReactNode, useEffect } from "react";
import { useScene } from "react-babylonjs";

interface Props {
  children?: ReactNode;
}

export const DebugLayer: FC<Props> = ({ children }) => {
  const scene = useScene();

  useEffect(() => {
    if (!scene) return;
    scene.debugLayer.show();
  }, [scene]);

  return children ?? null;
};
