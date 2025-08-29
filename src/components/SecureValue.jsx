import React, { useState } from "react";

export default function SecureValue({ value }) {
    const [visible, setVisible] = useState(false);

    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    return (
        <span
            style={{
                cursor: "pointer",
                userSelect: "none",
                filter: visible ? "none" : "blur(6px)",
                transition: "filter 0.2s ease",
            }}
            onMouseDown={show}
            onMouseUp={hide}
            onMouseLeave={hide}
            onTouchStart={show}
            onTouchEnd={hide}
        >
      {value ?? "—"}
    </span>
    );
}
