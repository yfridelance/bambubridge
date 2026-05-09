import React from "react";

interface ColorBadgeProps {
  color: string | string[];
  size?: number;
  style?: React.CSSProperties;
}

export const ColorBadge: React.FC<ColorBadgeProps> = ({
  color,
  size = 16,
  style,
}) => {
  const colors = Array.isArray(color) ? color : [color];

  if (colors.length === 0 || !colors[0]) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          border: "1px dashed #d9d9d9",
          ...style,
        }}
      />
    );
  }

  if (colors.length === 1) {
    const bgColor = colors[0].startsWith("#") ? colors[0] : `#${colors[0]}`;
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          backgroundColor: bgColor,
          border: "1px solid rgba(0, 0, 0, 0.1)",
          ...style,
        }}
      />
    );
  }

  // Multi-color gradient
  const gradientColors = colors
    .map((c) => (c.startsWith("#") ? c : `#${c}`))
    .join(", ");

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: `linear-gradient(135deg, ${gradientColors})`,
        border: "1px solid rgba(0, 0, 0, 0.1)",
        ...style,
      }}
    />
  );
};
