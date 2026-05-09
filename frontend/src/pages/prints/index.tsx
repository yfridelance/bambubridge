import { Table, Tag, Typography, Image, Progress, Space } from "antd";
import { useList, useNavigation } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import type { Print } from "../../types";
import { ColorBadge } from "../../components/common/ColorBadge";

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  RUNNING: "processing",
  COMPLETED: "success",
  ABORTED: "warning",
  FAILED: "error",
};

const statusLabels: Record<string, string> = {
  RUNNING: "print.running",
  COMPLETED: "print.completed",
  ABORTED: "print.aborted",
  FAILED: "print.failed",
};

export const PrintsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { show } = useNavigation();

  const listResult = useList<Print>({
    resource: "prints",
    pagination: { mode: "server", pageSize: 50 },
  });
  const data = listResult.result;
  const isLoading = listResult.query?.isLoading;

  const columns = [
    {
      title: "",
      dataIndex: "image_url",
      key: "image",
      width: 80,
      render: (url: string | null) =>
        url ? (
          <Image
            src={url}
            width={60}
            height={60}
            style={{ objectFit: "cover", borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              background: "#f0f0f0",
              borderRadius: 4,
            }}
          />
        ),
    },
    {
      title: t("print.fileName"),
      dataIndex: "file_name",
      key: "file_name",
      render: (name: string, record: Print) => (
        <a onClick={() => show("prints", record.id)}>{name}</a>
      ),
    },
    {
      title: t("print.date"),
      dataIndex: "print_date",
      key: "print_date",
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: Print, b: Print) =>
        new Date(a.print_date).getTime() - new Date(b.print_date).getTime(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: t("print.type"),
      dataIndex: "print_type",
      key: "print_type",
      render: (type: string) => (
        <Tag color={type === "cloud" ? "blue" : "default"}>
          {t(`print.${type}`)}
        </Tag>
      ),
    },
    {
      title: t("print.status"),
      key: "status",
      render: (_: unknown, record: Print) => {
        const status = record.layer_tracking?.status || "UNKNOWN";
        return (
          <Tag color={statusColors[status] || "default"}>
            {t(statusLabels[status] || "Unknown")}
          </Tag>
        );
      },
    },
    {
      title: t("print.progress"),
      key: "progress",
      render: (_: unknown, record: Print) => {
        if (!record.layer_tracking) return "-";
        const { progress_percent, layers_printed, total_layers } =
          record.layer_tracking;
        return (
          <Space direction="vertical" size={0}>
            <Progress
              percent={progress_percent || 0}
              size="small"
              style={{ width: 100 }}
            />
            {total_layers && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {layers_printed}/{total_layers} {t("print.layers")}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: t("print.filament"),
      key: "filaments",
      render: (_: unknown, record: Print) => (
        <Space>
          {record.filaments.map((f, idx) => (
            <ColorBadge key={idx} color={f.color} size={16} />
          ))}
          <Text type="secondary">{record.total_filament_g.toFixed(0)}g</Text>
        </Space>
      ),
    },
    {
      title: t("print.cost"),
      dataIndex: "total_cost",
      key: "total_cost",
      render: (cost: number) => (cost > 0 ? `${cost.toFixed(2)}` : "-"),
    },
  ];

  return (
    <div>
      <Title level={2}>{t("print.title")}</Title>

      <Table
        dataSource={data?.data || []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </div>
  );
};

export const PrintShowPage: React.FC = () => {
  const { t } = useTranslation();
  // TODO: Implement print detail page
  return (
    <div>
      <Title level={2}>{t("print.title")}</Title>
      <p>Print detail page - coming soon</p>
    </div>
  );
};
