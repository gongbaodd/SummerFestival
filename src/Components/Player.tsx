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
    const keyboard = useContext(Keyboard.Context);

    const cameraRef = useRef<UniversalCamera | null>(null);

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

    const moveDirection = signal(new Vector3(0, 0, 0));

    const updateFromControls = useCallback(() => {
        if (!scene) return;
        if (!keyboard) return;

        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        const h = keyboard.horizontal.value;
        const v = keyboard.vertical.value;

        const fwd = camRoot.forward;
        const right = camRoot.right;
        const correctedVertical = fwd.scaleInPlace(v);
        const correctedHorizontal = right.scaleInPlace(h);
        const move = correctedHorizontal.addInPlace(correctedVertical);

        let inputAmt = Math.abs(h) + Math.abs(v);
        if (inputAmt > 1) inputAmt = 1;
        if (inputAmt < 0) inputAmt = 0;

        moveDirection.value = (new Vector3((move).normalize().x, 0, (move).normalize().z)).scaleInPlace(PLAYER_SPEED * inputAmt);

        // rotation
        const rotation = new Vector3(keyboard.horizontalAxis.value, 0, keyboard.verticalAxis.value);
        if (rotation.length() > 0) {
            const angle = Math.atan2(keyboard.horizontalAxis.value, keyboard.verticalAxis.value) + camRoot.rotation.y;
            const targ = Quaternion.FromEulerAngles(0, angle, 0);
            player.rotationQuaternion = Quaternion.Slerp(player.rotationQuaternion, targ, 10*deltaTime);
        }
    }, [scene, keyboard]);

    useEffect(() => {
        if (!scene) return;
        if (!cameraRef.current) return;
        scene.activeCamera = cameraRef.current;
    }, [scene]);

    useBeforeRender(() => {
        camRoot.position = Vector3.Lerp(camRoot.position, player.position, 0.4);
        updateFromControls();
        player.moveWithCollisions(moveDirection.value);
    });

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
