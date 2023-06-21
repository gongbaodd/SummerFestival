import { ActionManager, ExecuteCodeAction, Scalar } from "@babylonjs/core";
import { signal } from "@preact/signals-react";
import { FC, useCallback, useMemo, useState } from "react";
import { useScene } from "react-babylonjs";

const keyMap = new Map<string, boolean>()

const vertical = signal(0)
const verticalAxis = signal(0)
const horizontal = signal(0)
const horizontalAxis = signal(0)

const dashing = signal(false)

const jumKeyDown = signal(false)

const updateFromKeybaord = () => {
    if (keyMap.get("ArrowUp")) {
        vertical.value = Scalar.Lerp(vertical.value, 1, 0.2)
        verticalAxis.value = 1
    } else if (keyMap.get("ArrowDown")) {
        vertical.value = Scalar.Lerp(vertical.value, -1, 0.2)
        verticalAxis.value = -1
    } else {
        vertical.value = 0
        verticalAxis.value = 0
    }

    if (keyMap.get("ArrowLeft")) {
        horizontal.value = Scalar.Lerp(horizontal.value, -1, 0.2)
        horizontalAxis.value = -1
    } else if (keyMap.get("ArrowRight")) {
        horizontal.value = Scalar.Lerp(horizontal.value, 1, 0.2)
        horizontalAxis.value = 1
    } else {
        horizontal.value = 0
        horizontalAxis.value = 0
    }

    if (keyMap.get("Shift")) {
        dashing.value = true
    } else {
        dashing.value = false
    }

    if (keyMap.get(" ")) {
        jumKeyDown.value = true
    } else {
        jumKeyDown.value = false
    }
}

interface Props {
    children: React.ReactNode
}

export const Controller: FC<Props> = ({ children }) => {
    const scene = useScene()
        
    const actionManager = useMemo(() => {
        if (!scene) return
        const am = new ActionManager(scene)
        const keyDown = new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            keyMap.set(evt.sourceEvent.key, evt.sourceEvent.type === "keydown")
        });
        const keyUp = new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            keyMap.set(evt.sourceEvent.key, evt.sourceEvent.type === "keyup")
        });
        am.registerAction(keyDown)
        am.registerAction(keyUp)
        return am
    }, [scene])
    
    return children;
}