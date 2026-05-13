import { Card, Typography, Descriptions, Tag, Select, Space, Spin, Alert } from "antd";
import { WifiOutlined, DisconnectOutlined, GlobalOutlined } from "@ant-design/icons";
import { useCustom } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import type { Settings } from "../../types";

const { Title } = Typography;

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const customResult = useCustom<{ data: Settings }>({
    url: "/api/v1/settings",
    method: "get",
  });
  const data = customResult.query?.data;
  const isLoading = customResult.query?.isLoading;
  const isError = customResult.query?.isError;

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message={t("common.error")}
        description={t("error.fetchFailed")}
        showIcon
      />
    );
  }

  const settings = data?.data as unknown as Settings;

  return (
    <div>
      <Title level={2}>{t("settings.title")}</Title>

      <Card title={t("settings.language")} style={{ marginBottom: 24 }}>
        <Space>
          <GlobalOutlined />
          <Select
            value={i18n.language}
            onChange={(value) => i18n.changeLanguage(value)}
            style={{ width: 200 }}
            options={[
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
            ]}
          />
        </Space>
      </Card>

      <Card title={t("settings.printer")} style={{ marginBottom: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label={t("settings.printerStatus")}>
            <Tag
              icon={settings?.read_only_mode ? <DisconnectOutlined /> : <WifiOutlined />}
              color={settings?.read_only_mode ? "warning" : "success"}
            >
              {settings?.read_only_mode ? "Read-Only" : t("settings.online")}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Printer ID">
            {settings?.printer_id || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Printer Name">
            {settings?.printer_name || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Spoolman" style={{ marginBottom: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label={t("settings.spoolman")}>
            {settings?.spoolman_url ? (
              <a href={settings.spoolman_url} target="_blank" rel="noopener noreferrer">
                {settings.spoolman_url}
              </a>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="API URL">
            {settings?.spoolman_api_url || "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.autoSpend")}>
            <Tag color={settings?.auto_spend ? "green" : "default"}>
              {settings?.auto_spend ? t("common.yes") : t("common.no")}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("settings.homeAssistant")} style={{ marginBottom: 24 }}>
        <Descriptions column={1}>
          <Descriptions.Item label={t("settings.haEnabled")}>
            <Tag color={settings?.ha_mqtt?.enabled ? "green" : "default"}>
              {settings?.ha_mqtt?.enabled ? t("common.yes") : t("common.no")}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.haStatus")}>
            {!settings?.ha_mqtt?.enabled ? (
              <Tag>{t("settings.haDisabled")}</Tag>
            ) : settings?.ha_mqtt?.connected ? (
              <Tag icon={<WifiOutlined />} color="success">
                {t("settings.haConnected")}
              </Tag>
            ) : (
              <Tag icon={<DisconnectOutlined />} color="warning">
                {t("settings.haDisconnected")}
              </Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.haHost")}>
            {settings?.ha_mqtt?.host
              ? `${settings.ha_mqtt.host}:${settings.ha_mqtt.port}${settings.ha_mqtt.tls ? " (TLS)" : ""}`
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.haDiscoveryPrefix")}>
            {settings?.ha_mqtt?.discovery_prefix || "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t("settings.haBaseTopic")}>
            {settings?.ha_mqtt?.base_topic || "-"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="System">
        <Descriptions column={1}>
          <Descriptions.Item label="Base URL">
            {settings?.base_url || window.location.origin}
          </Descriptions.Item>
          <Descriptions.Item label="External Spool AMS ID">
            {settings?.external_spool_ams_id}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};
