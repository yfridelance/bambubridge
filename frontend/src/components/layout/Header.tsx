import { useEffect, useState } from "react";
import { Space, Typography, Tag, Select, Switch, theme } from "antd";
import { WifiOutlined, DisconnectOutlined, GlobalOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useCustom } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import type { PrinterStatus } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";

const { useToken } = theme;

const { Text } = Typography;

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { themeMode, toggleTheme } = useTheme();
  const { token } = useToken();
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus | null>(null);

  const customResult = useCustom<{ data: PrinterStatus }>({
    url: "/api/v1/printers/PRINTER_1/status",
    method: "get",
    queryOptions: {
      refetchInterval: 5000,
    },
  });
  const data = customResult.query?.data;
  const isLoading = customResult.query?.isLoading;

  useEffect(() => {
    if (data?.data) {
      setPrinterStatus(data.data as unknown as PrinterStatus);
    }
  }, [data]);

  const isOnline = printerStatus?.online ?? false;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
        height: 64,
        backgroundColor: themeMode === "dark" ? "#1f1f1f" : token.colorBgContainer,
        borderBottom: `1px solid ${themeMode === "dark" ? "rgb(66, 66, 66)" : token.colorBorder}`,
      }}
    >
      <Space>
        {isLoading ? (
          <Tag color="default">{t("common.loading")}</Tag>
        ) : (
          <Tag
            icon={isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
            color={isOnline ? "success" : "error"}
          >
            {isOnline ? t("settings.online") : t("settings.offline")}
          </Tag>
        )}
        {printerStatus?.current_print && (
          <Text type="secondary">
            {printerStatus.current_print.file_name} -{" "}
            {printerStatus.current_print.progress}%
          </Text>
        )}
      </Space>

      <Space size="middle">
        <Switch
          checked={themeMode === "dark"}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<SunOutlined />}
        />
        <Space>
          <GlobalOutlined />
          <Select
            value={i18n.language}
            onChange={(value) => i18n.changeLanguage(value)}
            style={{ width: 100 }}
            options={[
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
            ]}
            size="small"
          />
        </Space>
      </Space>
    </div>
  );
};
