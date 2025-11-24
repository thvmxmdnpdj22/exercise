import React from "react";

const variants = {
  solid: {
    backgroundColor: "#22A45D",
    color: "#fff",
    border: "1px solid #22A45D",
  },
  outline: {
    backgroundColor: "transparent",
    color: "#22A45D",
    border: "1px solid #22A45D",
  },
  disabled: {
    backgroundColor: "#CFCFCF",
    color: "#fff",
    border: "1px solid #CFCFCF",
    cursor: "not-allowed",
  },
};

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "solid",
  minWidth = 220,
}) {
  const styleBase = {
    padding: "14px 28px",
    borderRadius: "9999px",
    fontSize: "1.05rem",
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .2s ease, background .2s ease",
    minWidth,
    boxShadow: "0 3px 12px rgba(34,164,93,0.25)",
    marginTop: '20px',
    marginLeft: '-110px'
  };

  const styleVariant = disabled ? variants.disabled : variants[variant];

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...styleBase, ...styleVariant }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => !disabled && (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}
