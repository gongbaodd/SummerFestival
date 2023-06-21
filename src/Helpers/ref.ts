import React from "react";

export const setForwardRef = function<T> (ref: React.ForwardedRef<T>, value: T) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}