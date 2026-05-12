import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GithubOutlined } from "@ant-design/icons";

interface VersionInfo {
  version: string;
  repo_url: string;
}

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/version")
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body?.success && body.data) {
          setInfo(body.data as VersionInfo);
        }
      })
      .catch(() => {
        // Silent fail — footer just shows the logo if the endpoint is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "24px 16px",
        marginTop: "auto",
        fontSize: 12,
        color: "var(--ant-color-text-tertiary, #888)",
      }}
    >
      <img src="/BambuBridge.png" alt="BambuBridge" style={{ height: 32 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {info?.version && (
          <span>
            {t("footer.version")} <code>{info.version}</code>
          </span>
        )}
        {info?.repo_url && (
          <a
            href={info.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <GithubOutlined />
            {t("footer.repo")}
          </a>
        )}
      </div>
    </footer>
  );
};
