import {
  Table,
  Tag,
  Typography,
  Image,
  Progress,
  Space,
  Card,
  Descriptions,
  Spin,
  Alert,
  Button,
} from "antd";
import { useList, useNavigation, useOne } from "@refinedev/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftOutlined } from "@ant-design/icons";
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
  const { list } = useNavigation();
  const { id } = useParams<{ id: string }>();

  const { result: print, query } = useOne<Print>({
    resource: "prints",
    id: id || "",
    queryOptions: { enabled: !!id },
  });

  if (query?.isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (query?.isError || !print) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={t("print.notFound")} showIcon />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => list("prints")}
          style={{ marginTop: 16 }}
        >
          {t("print.detail.back")}
        </Button>
      </div>
    );
  }

  const status = print.layer_tracking?.status || "UNKNOWN";

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => list("prints")}>
          {t("print.detail.back")}
        </Button>
      </Space>

      <Card>
        <Space align="start" size="middle" style={{ marginBottom: 16 }}>
          {print.image_url && (
            <Image
              src={print.image_url}
              width={120}
              height={120}
              style={{ objectFit: "cover", borderRadius: 4 }}
            />
          )}
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {print.file_name}
            </Title>
            <Space size="small" style={{ marginTop: 8 }}>
              <Tag color={print.print_type === "cloud" ? "blue" : "default"}>
                {t(`print.${print.print_type}`)}
              </Tag>
              <Tag color={statusColors[status] || "default"}>
                {t(statusLabels[status] || "print.status")}
              </Tag>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                {new Date(print.print_date).toLocaleString()}
              </Text>
            </div>
          </div>
        </Space>

        {print.layer_tracking && (
          <Card size="small" title={t("print.progress")} style={{ marginBottom: 16 }}>
            <Progress
              percent={print.layer_tracking.progress_percent || 0}
              status={status === "FAILED" || status === "ABORTED" ? "exception" : undefined}
            />
            <Descriptions column={{ xs: 1, sm: 2 }} size="small" style={{ marginTop: 12 }}>
              <Descriptions.Item label={t("print.layers")}>
                {print.layer_tracking.layers_printed} / {print.layer_tracking.total_layers ?? "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("print.detail.gramsBilled")}>
                {print.layer_tracking.filament_grams_billed?.toFixed(1) ?? "—"} g
              </Descriptions.Item>
              <Descriptions.Item label={t("print.detail.predictedEnd")}>
                {print.layer_tracking.predicted_end_time || "—"}
              </Descriptions.Item>
              <Descriptions.Item label={t("print.detail.actualEnd")}>
                {print.layer_tracking.actual_end_time || "—"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card size="small" title={t("print.filament")}>
          <Table
            dataSource={print.filaments}
            rowKey={(f) => `${f.ams_slot}`}
            pagination={false}
            size="small"
            columns={[
              {
                title: t("print.detail.amsSlot"),
                dataIndex: "ams_slot",
                key: "ams_slot",
                width: 80,
                render: (slot: number) => slot + 1,
              },
              {
                title: t("spool.color"),
                key: "color",
                width: 80,
                render: (_, f) => <ColorBadge color={f.color} size={20} />,
              },
              {
                title: t("spool.material"),
                dataIndex: "filament_type",
                key: "filament_type",
              },
              {
                title: t("print.detail.gramsUsed"),
                key: "grams",
                render: (_, f) => (
                  <span>
                    {f.grams_used.toFixed(1)} g
                    {f.estimated_grams != null && (
                      <Text type="secondary" style={{ marginLeft: 8 }}>
                        ({t("print.detail.estimated")}: {f.estimated_grams.toFixed(1)} g)
                      </Text>
                    )}
                  </span>
                ),
              },
              {
                title: t("print.detail.spool"),
                key: "spool",
                render: (_, f) =>
                  f.spool ? (
                    <a onClick={() => window.location.assign(`/spools/${f.spool!.id}`)}>
                      #{f.spool.id} {f.spool.name}
                    </a>
                  ) : (
                    <Text type="secondary">—</Text>
                  ),
              },
              {
                title: t("print.cost"),
                dataIndex: "cost",
                key: "cost",
                render: (cost?: number | null) => (cost && cost > 0 ? cost.toFixed(2) : "—"),
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>{t("print.detail.total")}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3}>
                  <Text strong>{print.total_filament_g.toFixed(1)} g</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5}>
                  <Text strong>{print.total_cost > 0 ? print.total_cost.toFixed(2) : "—"}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      </Card>
    </div>
  );
};
