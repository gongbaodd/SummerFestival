import {
  Color3,
  Matrix,
  MeshBuilder,
  Quaternion,
  Vector3,
  StandardMaterial,
  TransformNode,
  UniversalCamera,
  Mesh,
  Nullable,
  ShadowGenerator,
} from "@babylonjs/core";
import {
  FC,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useBeforeRender, useScene } from "react-babylonjs";
import { setForwardRef } from "../Helpers/ref";
import { Keyboard } from "./Keyboard";
import {
  computed,
  effect,
  signal,
  useComputed,
  useSignal,
} from "@preact/signals-react";

const PLAYER_SPEED = 0.45;
const JUMP_FORCE = 0.8;
const GRAVITY = -2.8;
const DASH_FACTOR = 2.5;
const DASH_TIME = 10;
const DOWN_TILT = new Vector3(0.8290313946973066, 0, 0);
const ORINGINAL_TILT = new Vector3(0.5934119456780721, 0, 0);

const camPos = new Vector3(0, 0, -30);

interface Props {
  shadow: Nullable<ShadowGenerator>;
}

export const Player: FC<Props> = ({ shadow }) => {
  const scene = useScene();

  const cameraRef = useRef<UniversalCamera | null>(null);

  const moveDirection = useSignal(Vector3.Zero());

  const horizontal = useSignal(0);
  const vertical = useSignal(0);

  const fwd = useSignal(Vector3.Zero());
  const right = useSignal(Vector3.Zero());
  const correctedVertical = useComputed(() => {
    return fwd.value.scaleInPlace(vertical.value);
  });
  const correctedHorizontal = useComputed(() => {
    return right.value.scaleInPlace(horizontal.value);
  });
  const move = useComputed(() => {
    return correctedHorizontal.value.addInPlace(correctedVertical.value);
  });
  const inpuAmt = useComputed(() => {
    const inputMag = Math.abs(horizontal.value) + Math.abs(vertical.value);
    if (inputMag > 1) return 1;
    if (inputMag < 0) return 0;
    return inputMag;
  });

  // TODO
  moveDirection.value = moveDirection.value.scaleInPlace(
    inpuAmt.value * PLAYER_SPEED
  );

  const player = useMemo(() => {
    if (!scene) return;

    const outer = MeshBuilder.CreateBox(
      "player",
      { width: 2, depth: 1, height: 3 },
      scene
    );
    outer.isVisible = false;
    outer.isPickable = false;
    outer.checkCollisions = true;

    outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

    outer.ellipsoid = new Vector3(1, 1.5, 1);
    outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

    outer.rotationQuaternion = new Quaternion(0, 1, 0, 0);

    shadow?.addShadowCaster(outer);

    return outer;
  }, [scene, shadow]);
  const body = useMemo(() => {
    if (!scene) return;

    const body = MeshBuilder.CreateCylinder(
      "body",
      {
        height: 3,
        diameterTop: 2,
        diameterBottom: 2,
        tessellation: 0,
        subdivisions: 0,
      },
      scene
    );
    const material = new StandardMaterial("ref", scene);
    material.diffuseColor = new Color3(0.8, 0.5, 0.5);

    body.material = material;
    body.isPickable = false;
    body.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0));

    return body;
  }, [scene]);
  const inner = useMemo(() => {
    if (!scene) return;
    const box = MeshBuilder.CreateBox(
      "inner",
      { width: 0.5, depth: 0.5, height: 0.25 },
      scene
    );
    return box;
  }, [scene]);
  const camRoot = useMemo(() => {
    const root = new TransformNode("CamRoot");
    root.position = new Vector3(0, 0, 0);
    root.rotation = new Vector3(0, Math.PI, 0);
    return root;
  }, []);
  const yTilt = useMemo(() => {
    const yTilt = new TransformNode("yTilt");
    // yTilt.rotation = Player.ORIGINAL_TILT
    return yTilt;
  }, []);

  useEffect(() => {
    if (!scene) return;
    if (!cameraRef.current) return;
    scene.activeCamera = cameraRef.current;
    camRoot.position = Vector3.Lerp(camRoot.position, player.position, 0.4);
  }, [scene, camRoot]);

  return (
    <>
      <abstractMesh name="player" fromInstance={player}>
        <abstractMesh name="body" fromInstance={body}>
          <abstractMesh name="inner" fromInstance={inner} />
        </abstractMesh>
      </abstractMesh>
      <transformNode name="camRoot" fromInstance={camRoot}>
        <universalCamera
          ref={cameraRef}
          name="playerCam"
          position={camPos}
          fov={0.5}
          lockedTarget={camRoot.position}
        >
          <transformNode name="yTilt" fromInstance={yTilt} />
        </universalCamera>
      </transformNode>
    </>
  );
};

Player.displayName = "Player";
