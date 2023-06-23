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
    PhysicsImpostor,
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
}


export const Player: FC<Props> = ({ }) => {
    const scene = useScene();
    const keyboard = useContext(Keyboard.Context);

    const cameraRef = useRef<UniversalCamera | null>(null);
    const camRootRef = useRef<TransformNode | null>(null);
    const playerRef = useRef<Mesh | null>(null);
    const bodyRef = useRef<Mesh | null>(null);

    const dashPressed = useSignal(false);
    const dashTime = useSignal(0);
    const canDash = useSignal(true);
    // handle dashing
    useEffect(() => {
        const exposeDashHanler = effect(() => {
            const { dashing } = keyboard;
            if (dashing.value && !dashPressed.value && canDash.value && !grounded.value) {
                canDash.value = false;
                dashPressed.value = true;
            }

            if (dashPressed.value) {
                if (dashTime.value > DASH_TIME) {
                    dashTime.value = 0;
                    dashPressed.value = false;
                }
                dashTime.value++;
            }
        });

        return exposeDashHanler;
    }, [])

    const moveDirection = useComputed(() => {
        const { current: camRoot } = camRootRef;
        const moveDirection = new Vector3(0, 0, 0)
        if (!scene || !keyboard || !camRoot) return moveDirection

        const h = keyboard.horizontal.value;
        const v = keyboard.vertical.value;

        const fwd = camRoot.forward;
        const right = camRoot.right;
        const correctedVertical = fwd.scaleInPlace(v);
        const correctedHorizontal = right.scaleInPlace(h);
        const move = correctedHorizontal.addInPlace(correctedVertical);

        const { inputAmt } = {
            get inputAmt() {
                const mag = Math.abs(h) + Math.abs(v)
                if (mag > 1) return 1
                if (mag < 0) return 0
                return mag
            }
        }

        const { dashFactor } = {
            get dashFactor() {
                if (dashPressed.value) {
                    if (dashTime.value <= DASH_TIME) {
                        return DASH_FACTOR;
                    }
                }
                return 1;
            }
        }

        return new Vector3(
            move.normalize().x * dashFactor,
            0,
            move.normalize().z * dashFactor
        ).scaleInPlace(PLAYER_SPEED * inputAmt);
    });

    const rotation = useComputed(() => {
        const { current: player } = playerRef;
        const { current: camRoot } = camRootRef;
        if (!scene || !keyboard || !player) return null;
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        const rotation = new Vector3(keyboard.horizontalAxis.value, 0, keyboard.verticalAxis.value);
        if (rotation.length() > 0) {
            const angle = Math.atan2(keyboard.horizontalAxis.value, keyboard.verticalAxis.value) + camRoot.rotation.y;
            const targ = Quaternion.FromEulerAngles(0, angle, 0);
            return Quaternion.Slerp(player.rotationQuaternion, targ, 10 * deltaTime);
        }
        return null
    });

    const gravity = useSignal(new Vector3());
    const grounded = useSignal(false);
    const lastGroudPos = useSignal(new Vector3());
    const jumpCount = useSignal(1);
    const jumped = useSignal(false);
    const isFalling = useSignal(false);

    const floorRaycast = useCallback((offsetx: number, offsetz: number, raycastlen: number) => {
        const { current: player } = playerRef
        if (!scene || !player) return;
        const rayCastFloorPos = new Vector3(
            player.position.x + offsetx,
            player.position.y + 0.5,
            player.position.z + offsetz,
        );
        const ray = new Ray(
            rayCastFloorPos,
            Vector3.Up().scale(-1),
            raycastlen,
        );
        const predict = (mesh: Mesh) => mesh.isPickable && mesh.isEnabled()
        const pick = scene.pickWithRay(ray, predict);
        if (pick.hit) {
            return pick.pickedPoint;
        } else {
            return Vector3.Zero();
        }
    }, [scene]);

    const isGrounded = useCallback(() => {
        const notOnGround = floorRaycast(0, 0, 0.6).equals(Vector3.Zero());
        return !notOnGround;
    }, [floorRaycast]);

    const updateGroundDetection = useCallback(() => {
        const { current: player } = playerRef;
        if (!scene || !player) return;
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        const isOnGround = isGrounded();

        if (!isOnGround) {
            if (checkSlope() && gravity.value.y <= 0) {
                gravity.value.y = 0
                jumpCount.value = 1
                grounded.value = true
            } else {
                gravity.value = gravity.value.addInPlace(
                    Vector3.Up().scale(GRAVITY * deltaTime)
                )
                grounded.value = false
            }
        }

        if (gravity.value.y < -JUMP_FORCE) {
            gravity.value.y = -JUMP_FORCE
        }

        if (gravity.value.y < 0 && jumped.value) {
            isFalling.value = true
        }

        if (isGrounded()) {
            gravity.value.y = 0;
            grounded.value = true;
            lastGroudPos.value.copyFrom(player.position);
            jumpCount.value = 1;
            canDash.value = true;
            dashTime.value = 0;
            dashPressed.value = false;
            jumped.value = false;
            isFalling.value = false;
        }

        const { jumpKeyDown } = keyboard;
        if (jumpKeyDown.value && jumpCount.value > 0) {
            gravity.value.y = JUMP_FORCE;
            jumpCount.value--;

            jumped.value = true;
            isFalling.value = false;
        }
    }, [isGrounded, keyboard])

    const checkSlope = useCallback(() => {
        const { current: player } = playerRef;
        if (!scene || !player) return;

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
        cameraRef.current.detachControl()

        if (playerRef.current) {
            playerRef.current.bakeTransformIntoVertices(
                Matrix.Translation(0, 1.5, 0)
            );
        }

        if (bodyRef.current) {
            bodyRef.current.bakeTransformIntoVertices(
                Matrix.Translation(0, 1.5, 0)
            );
        }
    }, [scene, cameraRef, playerRef, bodyRef]);

    useEffect(() => {
        const { current: player } = playerRef;
        if (!player) return;
        const disposeAnimate = effect(() => {
            // updateGroundDetection();
            if (rotation.value) {
                player.rotationQuaternion = rotation.value;
            }
            player.moveWithCollisions(moveDirection.value.addInPlace(gravity.value));
        })

        return disposeAnimate
    }, [])

    useBeforeRender(() => {
        const { current: player } = playerRef;
        const { current: camRoot } = camRootRef;
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
            <box
                name="player"
                width={2}
                depth={1}
                height={3}
                isVisible={false}
                isPickable={false}
                checkCollisions={true}
                ellipsoid={new Vector3(1, 1.5, 1)}
                ellipsoidOffset={new Vector3(0, 1.5, 0)}
                rotationQuaternion={new Quaternion(0, 1, 0, 0)}
                ref={playerRef}
            >
                <physicsImpostor type={PhysicsImpostor.BoxImpostor} _options={{ mass: 1, restitution: 0.9 }} />
                <cylinder
                    name="body"
                    height={3}
                    diameterTop={2}
                    diameterBottom={2}
                    tessellation={0}
                    subdivisions={0}
                    isPickable={false}
                    ref={bodyRef}
                >
                    <standardMaterial name="ref" diffuseColor={new Color3(.9,.5,.5)}/>
                    <box name="inner" width={.5} depth={.5} height={.25} />
                </cylinder>
            </box>
            <transformNode 
                name="camRoot" 
                position={new Vector3(0,0,0)}
                rotation={new Vector3(0,Math.PI,0)}
                ref={camRootRef}
            >
                <transformNode name="yTilt" rotation={ORIGINAL_TILT} >
                    <universalCamera
                        ref={cameraRef}
                        name="playerCam"
                        position={camPos}
                        fov={0.5}
                        lockedTarget={camRootRef.current?.position}
                    />
                </transformNode>
            </transformNode>
        </>
    );
};

Player.displayName = "Player";
