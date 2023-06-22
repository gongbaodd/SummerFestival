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
    Ray,
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
const ORIGINAL_TILT = new Vector3(0.5934119456780721, 0, 0);

const camPos = new Vector3(0, 0, -30);

interface Props {
    shadow: Nullable<ShadowGenerator>;
}

export const Player: FC<Props> = ({ shadow }) => {
    const scene = useScene();
    const keyboard = useContext(Keyboard.Context);

    const cameraRef = useRef<UniversalCamera | null>(null);

    const player = useMemo<Mesh>(() => {
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

        return outer;
    }, [scene]);

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
        yTilt.rotation = ORIGINAL_TILT;
        return yTilt;
    }, []);

    const moveDirection = signal(new Vector3(0, 0, 0));
    const gravity = useMemo(() => new Vector3(), []);
    const grounded = signal(false);
    const lastGroudPos = useMemo(() => new Vector3(), []);
    const jumpCount = signal(1);
    const dashPressed = signal(false);
    const canDash = signal(true);
    const dashTime = signal(0);

    const updateFromControls = useCallback(() => {
        if (!scene) return;
        if (!keyboard) return;

        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        const h = keyboard.horizontal.value;
        const v = keyboard.vertical.value;

        let dashFactor = 1;
        if (dashPressed.value) {
            if (dashTime.value > DASH_TIME) {
                dashTime.value = 0;
                dashPressed.value = false;
            } else {
                dashFactor = DASH_FACTOR;
            }
            dashTime.value++;
        }

        const fwd = camRoot.forward;
        const right = camRoot.right;
        const correctedVertical = fwd.scaleInPlace(v);
        const correctedHorizontal = right.scaleInPlace(h);
        const move = correctedHorizontal.addInPlace(correctedVertical);

        let inputAmt = Math.abs(h) + Math.abs(v);
        if (inputAmt > 1) inputAmt = 1;
        if (inputAmt < 0) inputAmt = 0;

        moveDirection.value = new Vector3(
            (move).normalize().x * dashFactor,
            0,
            (move).normalize().z * dashFactor
        ).scaleInPlace(PLAYER_SPEED * inputAmt);

        const { dashing } = keyboard;
        if (dashing.value && !dashPressed.value && canDash.value && !grounded.value) {
            canDash.value = false;
            dashPressed.value = true;
        }

        // rotation
        const rotation = new Vector3(keyboard.horizontalAxis.value, 0, keyboard.verticalAxis.value);
        if (rotation.length() > 0) {
            const angle = Math.atan2(keyboard.horizontalAxis.value, keyboard.verticalAxis.value) + camRoot.rotation.y;
            const targ = Quaternion.FromEulerAngles(0, angle, 0);
            player.rotationQuaternion = Quaternion.Slerp(player.rotationQuaternion, targ, 10 * deltaTime);
        }
    }, [scene, keyboard]);

    const floorRaycast = useCallback((offsetx: number, offsetz: number, raycastlen: number) => {
        if (!scene) return;
        const rayCastFloorPos = new Vector3(player.position.x + offsetx, player.position.y + 0.5, player.position.z + offsetz);
        const ray = new Ray(rayCastFloorPos, Vector3.Up().scale(-1), raycastlen);
        const predict = (mesh: Mesh) => mesh.isPickable && mesh.isEnabled()
        const pick = scene.pickWithRay(ray, predict);
        if (pick.hit) {
            return pick.pickedPoint;
        } else {
            return Vector3.Zero();
        }
    }, [scene]);

    const isGrounded = useCallback(() => {
        const noGround = floorRaycast(0, 0, 0.6).equals(Vector3.Zero());
        return !noGround;
    }, [floorRaycast]);

    const updateGroundDetection = useCallback(() => {
        if (!scene) return;
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;

        if (isGrounded()) {
            gravity.y = 0;
            grounded.value = true;
            lastGroudPos.copyFrom(player.position);
            jumpCount.value = 1;
            canDash.value = true;
            dashTime.value = 0;
            dashPressed.value = false;
        }

        const { jumKeyDown } = keyboard;
        if (jumKeyDown.value && jumpCount.value > 0) {
            gravity.y = JUMP_FORCE;
            jumpCount.value--;
        }
    }, [isGrounded, keyboard])

    const checkSlope = useCallback(() => {
        if (!scene) return;

        const predicate = (mesh: Mesh) => mesh.isPickable && mesh.isEnabled()

        const picks = [
            [0, .5, .25],
            [0, .5, -0.25],
            [.25, .5, 0],
            [-.25, .5, 0]
        ].map(([x, y, z]) => {
            const raycast = new Vector3(
                player.position.x + x,
                player.position.y + y,
                player.position.z + z
            )
            const ray = new Ray(
                raycast,
                Vector3.Up().scale(-1),
                1.5
            )
            const pick = scene.pickWithRay(ray, predicate)
            return pick
        })

        return picks.some(pick => {
            if (pick.hit && !pick.getNormal().equals(Vector3.Up())) {
                if (pick.pickedMesh.name.includes("stair")) {
                    return true
                }
            }
        })

    }, [scene]);

    useEffect(() => {
        if (!scene) return;
        if (!cameraRef.current) return;
        scene.activeCamera = cameraRef.current;
    }, [scene]);

    useEffect(() => {
        shadow?.addShadowCaster(player);
    }, [shadow])

    useBeforeRender(() => {
        updateFromControls();
        updateGroundDetection();
        player.moveWithCollisions(moveDirection.value);

        const centerPlayer = new Vector3(
            player.position.x,
            player.position.y + 2,
            player.position.z
        )
        camRoot.position = Vector3.Lerp(
            camRoot.position,
            centerPlayer, 
            0.4
        );
    });

    return (
        <>
            <abstractMesh name="player" fromInstance={player}>
                <abstractMesh name="body" fromInstance={body}>
                    <abstractMesh name="inner" fromInstance={inner} />
                </abstractMesh>
            </abstractMesh>
            <transformNode name="camRoot" fromInstance={camRoot}>
                <transformNode name="yTilt" fromInstance={yTilt} >
                    <universalCamera
                        ref={cameraRef}
                        name="playerCam"
                        position={camPos}
                        fov={0.5}
                        lockedTarget={camRoot.position}
                    />
                </transformNode>
            </transformNode>
        </>
    );
};

Player.displayName = "Player";
