"use client";

import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightElement, id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.3px",
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          {icon && (
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              width: "100%",
              padding: icon ? "10px 12px 10px 38px" : "10px 12px",
              paddingRight: rightElement ? 44 : 12,
              border: `1.5px solid ${error ? "var(--danger)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              fontSize: 14,
              color: "var(--text-primary)",
              background: "var(--bg-card)",
              outline: "none",
              transition: "border-color var(--transition), box-shadow var(--transition)",
              ...style,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = error
                ? "var(--danger)"
                : "var(--primary)";
              e.target.style.boxShadow = error
                ? "0 0 0 3px rgba(239,68,68,0.15)"
                : "0 0 0 3px rgba(65,141,191,0.15)";
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error
                ? "var(--danger)"
                : "var(--border)";
              e.target.style.boxShadow = "none";
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightElement && (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {rightElement}
            </span>
          )}
        </div>
        {error && (
          <span
            style={{ fontSize: 12, color: "var(--danger)", fontWeight: 500 }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
