import React, { useState, useCallback } from "react";

export default function SecureValue({ value, blur = 6, align = "right" }) {
    const [visible, setVisible] = useState(false);

    const toggle = useCallback((e) => {
        e.stopPropagation();
        setVisible((v) => !v);
    }, []);

    const onKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setVisible((v) => !v);
        }
    }, []);

    return (
        <span
            role="button"
            aria-pressed={visible}
            tabIndex={0}
            onClick={toggle}
            onKeyDown={onKeyDown}
            style={{
                cursor: "pointer",
                userSelect: "none",
                filter: visible ? "none" : `blur(${blur}px)`,
                transition: "filter 0.2s ease",
                display: "inline-block",
                minWidth: 40,      // щоб зона не стрибала під час тоглу
                textAlign: align,  // зручно для правого вирівнювання в таблицях
                width: '100%',
                height: '100%',
            }}
            title={visible ? "Клікніть, щоб приховати" : "Клікніть, щоб показати"}
        >
      {value ?? "—"}
    </span>
    );
}
