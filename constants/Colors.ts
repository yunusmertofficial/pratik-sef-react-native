const primary = "#FF6B6B";
const secondary = "#4ECDC4";
const accent = "#FFE66D";
const background = "#FFFFFF";
const surface = "#F8F9FA";
const text = "#2C3E50";
const textLight = "#7F8C8D";
const border = "#E9ECEF";
const success = "#27AE60";
const error = "#E74C3C";

export default {
  light: {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    textLight,
    border,
    success,
    error,
    tint: primary,
    tabIconDefault: textLight,
    tabIconSelected: primary,
  },
  dark: {
    primary,
    secondary,
    accent,
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textLight: "#B0B0B0",
    border: "#333333",
    success,
    error,
    tint: primary,
    tabIconDefault: "#B0B0B0",
    tabIconSelected: primary,
  },
};
