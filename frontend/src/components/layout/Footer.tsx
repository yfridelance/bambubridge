import { useTheme } from "../../contexts/ThemeContext";

export const Footer: React.FC = () => {
  const { themeMode } = useTheme();

  return (
    <footer
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
        marginTop: "auto",
      }}
    >
      <img
        src="/BambuBridge.png"
        alt="BambuBridge"
        style={{
          height: 32,
          opacity: themeMode === "dark" ? 0.7 : 1,
          filter: themeMode === "dark" ? "invert(1) brightness(0.9)" : "none",
        }}
      />
    </footer>
  );
};
