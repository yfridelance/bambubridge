import { Card, Button, Space, Typography, Tag, Alert, Empty, Spin, Descriptions } from "antd";
import {
  ExclamationCircleOutlined,
  LinkOutlined,
  SwapOutlined,
  WarningOutlined,
  BgColorsOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useCustom } from "@refinedev/core";
import type { AmsData, AmsUnit, Tray } from "../../types";
import { ColorBadge } from "../../components/common/ColorBadge";

const { Title, Text } = Typography;

interface TrayWithIssue extends Tray {
  ams_unit_id: number;
}

export const IssuesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const customResult = useCustom<{ data: AmsData }>({
    url: "/api/v1/printers/PRINTER_1/ams",
    method: "get",
    queryOptions: {
      refetchInterval: 5000,
    },
  });

  const data = customResult.query?.data;
  const isLoading = customResult.query?.isLoading;
  const amsData = data?.data as unknown as AmsData;

  // Collect all trays with issues
  const issueTrays: TrayWithIssue[] = [];

  if (amsData) {
    // Check external tray
    if (amsData.external_tray?.issue) {
      issueTrays.push({ ...amsData.external_tray, ams_unit_id: -1 });
    }

    // Check AMS unit trays
    amsData.ams_units?.forEach((unit: AmsUnit) => {
      unit.trays?.forEach((tray: Tray) => {
        if (tray.issue || tray.color_mismatch || tray.unmapped_bambu_tag) {
          issueTrays.push({ ...tray, ams_unit_id: unit.id });
        }
      });
    });
  }

  const handleLinkBambu = (tray: TrayWithIssue) => {
    const params = new URLSearchParams({
      tag: tray.unmapped_bambu_tag || "",
      ams: String(tray.ams_id),
      tray: String(tray.index),
    });
    if (tray.material) params.set("material", tray.material);
    if (tray.tray_color) params.set("color", tray.tray_color);
    navigate(`/tags/link-bambu?${params.toString()}`);
  };

  const handleReassign = (tray: TrayWithIssue) => {
    navigate(`/tags?ams=${tray.ams_id}&tray=${tray.index}&action=fill`);
  };

  const getIssueIcon = (tray: TrayWithIssue) => {
    if (tray.unmapped_bambu_tag) {
      return <LinkOutlined style={{ color: "#faad14" }} />;
    }
    if (tray.issue_type === "material_mismatch") {
      return <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />;
    }
    if (tray.color_mismatch) {
      return <BgColorsOutlined style={{ color: "#faad14" }} />;
    }
    return <WarningOutlined style={{ color: "#faad14" }} />;
  };

  const getIssueTitle = (tray: TrayWithIssue) => {
    if (tray.unmapped_bambu_tag) {
      return t("alert.unmappedTag");
    }
    if (tray.issue_type === "material_mismatch") {
      return t("alert.materialMismatch");
    }
    if (tray.color_mismatch) {
      return t("alert.colorMismatch");
    }
    return t("issue.unknownIssue");
  };

  const getTrayLabel = (tray: TrayWithIssue) => {
    if (tray.ams_unit_id === -1) {
      return t("home.externalSpool");
    }
    return `AMS ${tray.ams_id + 1}, ${t("home.tray")} ${tray.index + 1}`;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>{t("issue.title")}</Title>

      {issueTrays.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("issue.noIssues")}
          />
        </Card>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {issueTrays.map((tray, idx) => (
            <Card key={`${tray.ams_id}-${tray.index}-${idx}`}>
              <Space direction="vertical" style={{ width: "100%" }}>
                {/* Issue Header */}
                <Space align="start">
                  {getIssueIcon(tray)}
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      {getIssueTitle(tray)}
                    </Text>
                    <br />
                    <Text type="secondary">{getTrayLabel(tray)}</Text>
                  </div>
                </Space>

                {/* Issue Details based on type */}
                {tray.unmapped_bambu_tag && (
                  <Alert
                    type="warning"
                    message={t("issue.unmappedTagDesc")}
                    description={
                      <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label={t("tag.bambuTagId")}>
                          <code>{tray.unmapped_bambu_tag}</code>
                        </Descriptions.Item>
                        {tray.material && (
                          <Descriptions.Item label={t("spool.material")}>
                            <Tag>{tray.material}</Tag>
                          </Descriptions.Item>
                        )}
                        {tray.tray_color && (
                          <Descriptions.Item label={t("spool.color")}>
                            <ColorBadge color={tray.tray_color} size={20} />
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    }
                    action={
                      <Button
                        type="primary"
                        icon={<LinkOutlined />}
                        onClick={() => handleLinkBambu(tray)}
                      >
                        {t("home.linkToSpoolman")}
                      </Button>
                    }
                  />
                )}

                {tray.issue_type === "material_mismatch" && (
                  <Alert
                    type="error"
                    message={t("issue.materialMismatchDesc")}
                    description={
                      <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label={t("issue.amsReports")}>
                          <Tag color="blue">{tray.material}</Tag>
                        </Descriptions.Item>
                        {tray.spool_name && (
                          <Descriptions.Item label={t("issue.assignedSpool")}>
                            <Space>
                              <Text>{tray.spool_name}</Text>
                              {tray.spool_vendor && (
                                <Text type="secondary">({tray.spool_vendor})</Text>
                              )}
                            </Space>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    }
                    action={
                      <Button
                        type="primary"
                        icon={<SwapOutlined />}
                        onClick={() => handleReassign(tray)}
                      >
                        {t("issue.reassignSpool")}
                      </Button>
                    }
                  />
                )}

                {tray.color_mismatch && !tray.unmapped_bambu_tag && tray.issue_type !== "material_mismatch" && (
                  <Alert
                    type="warning"
                    message={t("issue.colorMismatchDesc")}
                    description={
                      <div>
                        <Space style={{ marginTop: 8 }}>
                          <div style={{ textAlign: "center" }}>
                            <Text type="secondary">{t("issue.amsColor")}</Text>
                            <br />
                            <ColorBadge color={tray.tray_color} size={32} />
                          </div>
                          <SwapOutlined style={{ fontSize: 20, color: "#999" }} />
                          <div style={{ textAlign: "center" }}>
                            <Text type="secondary">{t("issue.spoolColor")}</Text>
                            <br />
                            <ColorBadge color={tray.spool_color} size={32} />
                          </div>
                        </Space>
                        {tray.color_mismatch_message && (
                          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                            {tray.color_mismatch_message}
                          </Text>
                        )}
                      </div>
                    }
                    action={
                      <Button
                        icon={<SwapOutlined />}
                        onClick={() => handleReassign(tray)}
                      >
                        {t("issue.reassignSpool")}
                      </Button>
                    }
                  />
                )}

                {/* Spool Info if assigned */}
                {tray.spool_id && !tray.unmapped_bambu_tag && (
                  <Card size="small" style={{ backgroundColor: "#fafafa" }}>
                    <Space>
                      <ColorBadge color={tray.color} size={24} />
                      <div>
                        <Text strong>{tray.spool_name}</Text>
                        {tray.spool_vendor && (
                          <Text type="secondary"> - {tray.spool_vendor}</Text>
                        )}
                        <br />
                        <Text type="secondary">
                          #{tray.spool_id} • {tray.material}
                          {tray.remaining_g !== null && tray.remaining_g !== undefined && (
                            <> • {tray.remaining_g.toFixed(0)}g</>
                          )}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                )}
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};
