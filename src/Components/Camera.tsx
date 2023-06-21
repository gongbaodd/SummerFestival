import { Mesh, Nullable, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core"
import { useRef, useMemo, useEffect, useCallback, FC } from "react"
import { useScene } from "react-babylonjs"

interface Props {
    player: Nullable<Mesh>
}

const camPos = new Vector3(0, 0, -30)

export const Camera: FC<Props> = ({ player }) => {
    const scene = useScene()
    const cameraRef = useRef<UniversalCamera | null>(null)
    const root = useMemo(() => {
        const root = new TransformNode("root")
        root.position = new Vector3(0, 0, 0)
        root.rotation = new Vector3(0, Math.PI, 0)
        return root
    }, [])
    const yTilt = useMemo(() => {
        const yTilt = new TransformNode("yTilt")
        // yTilt.rotation = Player.ORIGINAL_TILT
        return yTilt
    }, [])

    useEffect(() => {
        if (!scene) return
        if (!cameraRef.current) return
        scene.activeCamera = cameraRef.current
    }, [scene])

    const update = useCallback(() => {
        const camera = cameraRef.current
        if (!camera) return
        if (!player) return

        root.position = Vector3.Lerp(root.position, player.position, 0.4)
    }, [player])

    return (
        <transformNode name="root" fromInstance={root} >
            <universalCamera ref={cameraRef} name="playerCam" position={camPos} fov={.5} lockedTarget={root.position} >
                <transformNode name="yTilt" fromInstance={yTilt} />
            </universalCamera>
        </transformNode>
    )
}