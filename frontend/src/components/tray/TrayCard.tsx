import {
  Card,
  Button,
  Space,
  Typography,
  Badge,
  Progress,
  Tooltip,
} from "antd";
import {
  ExclamationCircleOutlined,
  LinkOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Tray } from "../../types";
import { ColorBadge } from "../common/ColorBadge";

const { Text, Title } = Typography;

interface TrayCardProps {
  tray: Tray;
  amsId: number;
  isExternal?: boolean;
}

export const TrayCard: React.FC<TrayCardProps> = ({
  tray,
  amsId,
  isExternal = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasIssue =
    tray.issue || tray.color_mismatch || tray.unmapped_bambu_tag;
  const isEmpty =
    !tray.spool_id &&
    !tray.unmapped_bambu_tag &&
    !tray.non_bambu_spool &&
    !tray.is_loaded;

  const remainingPercent =
    tray.remaining_g && tray.remaining_g > 0
      ? Math.min(100, Math.round((tray.remaining_g / 1000) * 100))
      : 0;

  const handleFill = () => {
    const params = new URLSearchParams({
      ams: String(amsId),
      tray: String(tray.index),
    });
    if (tray.material) params.set("material", tray.material);
    const color = tray.tray_color || tray.color;
    if (color) params.set("color", color);
    navigate(`/fill-tray?${params.toString()}`);
  };

  const handleLinkBambu = () => {
    const params = new URLSearchParams({
      tag: tray.unmapped_bambu_tag || "",
      ams: String(amsId),
      tray: String(tray.index),
    });
    if (tray.material) params.set("material", tray.material);
    if (tray.tray_color) params.set("color", tray.tray_color);
    navigate(`/tags/link-bambu?${params.toString()}`);
  };

  const getStatusBadge = () => {
    if (tray.unmapped_bambu_tag) {
      return <Badge status="warning" text={t("alert.unmappedTag")} />;
    }
    if (tray.non_bambu_spool && !tray.spool_id) {
      return <Badge status="processing" text={t("alert.nonBambuDetected")} />;
    }
    if (tray.color_mismatch) {
      return <Badge status="warning" text={t("alert.colorMismatch")} />;
    }
    if (tray.issue_type === "material_mismatch") {
      return <Badge status="error" text={t("alert.materialMismatch")} />;
    }
    return null;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          {hasIssue && (
            <ExclamationCircleOutlined style={{ color: "#faad14" }} />
          )}
          <Text strong>
            {isExternal
              ? t("home.externalSpool")
              : `${t("home.tray")} ${tray.index + 1}`}
          </Text>
          {tray.material && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tray.material}
            </Text>
          )}
        </Space>
      }
      extra={
        tray.color && (
          <Tooltip title={tray.color}>
            <ColorBadge color={tray.color} size={20} />
          </Tooltip>
        )
      }
      style={{ height: "100%" }}
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 120,
        },
      }}
    >
      {/* Status Badge */}
      {getStatusBadge()}

      {/* Spool Info */}
      {tray.spool_id ? (
        <div>
          <Title level={5} style={{ margin: 0 }}>
            {tray.spool_name}
          </Title>
          <Text type="secondary">
            #{tray.spool_id} {tray.spool_vendor && `- ${tray.spool_vendor}`}
          </Text>
          {tray.remaining_g !== null && tray.remaining_g !== undefined && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{t("home.remaining")}:</Text>
              <Progress
                percent={remainingPercent}
                size="small"
                format={() => `${tray.remaining_g?.toFixed(0)}g`}
                status={remainingPercent < 20 ? "exception" : "normal"}
              />
            </div>
          )}
        </div>
      ) : tray.unmapped_bambu_tag ? (
        <div style={{ textAlign: "center" }}>
          <Text type="warning">{t("home.unknownSpool")}</Text>
          <div style={{ marginTop: 8 }}>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={handleLinkBambu}
            >
              {t("home.linkToSpoolman")}
            </Button>
          </div>
        </div>
      ) : tray.non_bambu_spool ? (
        <div>
          <Text>{t("home.nonBambuSpool")}</Text>
          {tray.material && (
            <div>
              <Text type="secondary">{tray.material}</Text>
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <div
          style={{
            textAlign: "center",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text type="secondary">{t("home.empty")}</Text>
        </div>
      ) : (
        <div>
          <Text type="secondary">
            {tray.material} - {tray.remaining_g?.toFixed(0)}g
          </Text>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: "auto" }}>
        <Button
          type={tray.non_bambu_spool ? "primary" : "default"}
          icon={<PlusOutlined />}
          onClick={handleFill}
          block
          size="small"
          disabled={!!tray.spool_id || !!tray.unmapped_bambu_tag}
        >
          {t("home.assign")}
        </Button>
      </div>
    </Card>
  );
};
