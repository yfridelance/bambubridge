import { Row, Col, Card, Spin, Alert, Typography, Space, Statistic } from "antd";
import { useCustom } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { TrayCard } from "../../components/tray/TrayCard";
import type { AmsData } from "../../types";

const { Title } = Typography;

export const HomePage: React.FC = () => {
  const { t } = useTranslation();

  const customResult = useCustom<{ data: AmsData }>({
    url: "/api/v1/printers/PRINTER_1/ams",
    method: "get",
    queryOptions: {
      refetchInterval: 5000,
    },
  });
  const data = customResult.query?.data;
  const isLoading = customResult.query?.isLoading;
  const isError = customResult.query?.isError;
  const error = customResult.query?.error;

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        message={t("common.error")}
        description={error?.message || t("error.fetchFailed")}
        showIcon
      />
    );
  }

  const amsData = data?.data as unknown as AmsData;

  return (
    <div>
      <Title level={2}>{t("home.title")}</Title>

      {/* External Spool */}
      {amsData?.external_tray && (
        <Card title={t("home.externalSpool")} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <TrayCard
                tray={amsData.external_tray}
                amsId={255}
                isExternal
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* AMS Units */}
      {amsData?.ams_units?.map((ams) => (
        <Card
          key={ams.id}
          title={
            <Space>
              <span>{ams.model || "AMS"}</span>
              {ams.humidity !== null && ams.humidity !== undefined && (
                <Statistic
                  title={t("home.humidity")}
                  value={ams.humidity}
                  suffix="%"
                  valueStyle={{ fontSize: 14 }}
                  style={{ display: "inline-block", marginLeft: 16 }}
                />
              )}
              {ams.temperature !== null && ams.temperature !== undefined && (
                <Statistic
                  title={t("home.temperature")}
                  value={ams.temperature}
                  suffix="°C"
                  valueStyle={{ fontSize: 14 }}
                  style={{ display: "inline-block", marginLeft: 16 }}
                />
              )}
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {ams.trays.map((tray) => (
              <Col key={`${ams.id}-${tray.index}`} xs={24} sm={12} md={6}>
                <TrayCard tray={tray} amsId={ams.id} />
              </Col>
            ))}
          </Row>
        </Card>
      ))}

      {!amsData?.ams_units?.length && !amsData?.external_tray && (
        <Alert
          type="info"
          message={t("error.printerOffline")}
          showIcon
        />
      )}
    </div>
  );
};
