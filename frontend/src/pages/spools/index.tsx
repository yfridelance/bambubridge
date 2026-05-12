import { useState } from "react";
import {
  Table,
  Space,
  Tag,
  Button,
  Input,
  Select,
  Card,
  Typography,
  Progress,
  Descriptions,
  Spin,
  Alert,
} from "antd";
import { useList, useNavigation, useOne } from "@refinedev/core";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TagOutlined, EyeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { Spool } from "../../types";
import { ColorBadge } from "../../components/common/ColorBadge";

const { Title } = Typography;
const { Search } = Input;

export const SpoolsListPage: React.FC = () => {
  const { t } = useTranslation();
  const { show } = useNavigation();
  const [materialFilter, setMaterialFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");

  const listResult = useList<Spool>({
    resource: "spools",
    filters: materialFilter ? [{ field: "material", operator: "eq", value: materialFilter }] : [],
  });
  const data = listResult.result;
  const isLoading = listResult.query?.isLoading;

  // Get unique materials for filter
  const materials = new Set<string>();
  (data?.data || []).forEach((spool: Spool) => {
    if (spool.material) materials.add(spool.material);
  });

  // Filter by search text
  const filteredData = (data?.data || []).filter((spool: Spool) => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      spool.name?.toLowerCase().includes(search) ||
      spool.material?.toLowerCase().includes(search) ||
      spool.vendor?.toLowerCase().includes(search)
    );
  });

  const columns = [
    {
      title: t("spool.color"),
      dataIndex: "color",
      key: "color",
      width: 60,
      render: (color: string | string[]) => <ColorBadge color={color} size={24} />,
    },
    {
      title: t("spool.name"),
      dataIndex: "name",
      key: "name",
      sorter: (a: Spool, b: Spool) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: t("spool.material"),
      dataIndex: "material",
      key: "material",
      render: (material: string) => <Tag>{material}</Tag>,
      sorter: (a: Spool, b: Spool) => (a.material || "").localeCompare(b.material || ""),
    },
    {
      title: t("spool.vendor"),
      dataIndex: "vendor",
      key: "vendor",
      sorter: (a: Spool, b: Spool) => (a.vendor || "").localeCompare(b.vendor || ""),
    },
    {
      title: t("spool.remaining"),
      dataIndex: "remaining_g",
      key: "remaining_g",
      render: (remaining: number | null, record: Spool) => {
        if (remaining === null || remaining === undefined) return "-";
        const total = record.weight_g || 1000;
        const percent = Math.min(100, Math.round((remaining / total) * 100));
        return (
          <Space>
            <Progress
              percent={percent}
              size="small"
              style={{ width: 80 }}
              status={percent < 20 ? "exception" : "normal"}
            />
            <span>{remaining.toFixed(0)}g</span>
          </Space>
        );
      },
      sorter: (a: Spool, b: Spool) => (a.remaining_g || 0) - (b.remaining_g || 0),
    },
    {
      title: t("spool.tag"),
      dataIndex: "tag",
      key: "tag",
      render: (tag: string | null) =>
        tag ? (
          <Tag icon={<TagOutlined />} color="blue">
            {tag.substring(0, 8)}...
          </Tag>
        ) : (
          <Tag>{t("spool.noTag")}</Tag>
        ),
    },
    {
      title: t("spool.assignedTo"),
      key: "assigned",
      render: (_: unknown, record: Spool) =>
        record.ams_id !== null && record.tray_index !== null ? (
          <Tag color="green">
            AMS {record.ams_id} - Tray {(record.tray_index || 0) + 1}
          </Tag>
        ) : (
          <Tag>{t("spool.notAssigned")}</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_: unknown, record: Spool) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => show("spools", record.id)}
        >
          {t("common.view")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>{t("spool.title")}</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder={t("common.search")}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            placeholder={t("spool.material")}
            allowClear
            style={{ width: 150 }}
            onChange={(value) => setMaterialFilter(value)}
            options={Array.from(materials).map((m) => ({ label: m, value: m }))}
          />
        </Space>
      </Card>

      <Table
        dataSource={filteredData}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </div>
  );
};

export const SpoolShowPage: React.FC = () => {
  const { t } = useTranslation();
  const { list } = useNavigation();
  const { id } = useParams<{ id: string }>();

  const { result: spool, query } = useOne<Spool>({
    resource: "spools",
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

  if (query?.isError || !spool) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={t("spool.notFound")} showIcon />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => list("spools")}
          style={{ marginTop: 16 }}
        >
          {t("spool.detail.back")}
        </Button>
      </div>
    );
  }

  const remaining = spool.remaining_g ?? 0;
  const total = spool.weight_g ?? 0;
  const remainingPct = total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0;
  const isAssigned =
    spool.ams_id !== null && spool.ams_id !== undefined && spool.tray_index !== null && spool.tray_index !== undefined;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => list("spools")}>
          {t("spool.detail.back")}
        </Button>
      </Space>

      <Card>
        <Space align="center" size="middle" style={{ marginBottom: 16 }}>
          <ColorBadge color={spool.color} size={32} />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              {spool.name}
            </Title>
            <Space size="small" style={{ marginTop: 4 }}>
              <Tag color="blue">{spool.material}</Tag>
              {spool.vendor && <Tag>{spool.vendor}</Tag>}
              {isAssigned ? (
                <Tag color="green">
                  AMS {spool.ams_id} - Tray {(spool.tray_index ?? 0) + 1}
                </Tag>
              ) : (
                <Tag>{t("spool.notAssigned")}</Tag>
              )}
            </Space>
          </div>
        </Space>

        {total > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Progress
              percent={remainingPct}
              format={() => `${remaining}g / ${total}g`}
              status={remainingPct < 10 ? "exception" : "active"}
            />
          </div>
        )}

        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label={t("spool.material")}>{spool.material}</Descriptions.Item>
          <Descriptions.Item label={t("spool.vendor")}>{spool.vendor || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("spool.detail.weight")}>{spool.weight_g ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("spool.detail.diameter")}>{spool.diameter_mm ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={t("spool.remaining")}>
            {spool.remaining_g !== null && spool.remaining_g !== undefined ? `${spool.remaining_g} g` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("spool.detail.remainingLength")}>
            {spool.remaining_length_mm ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("spool.location")}>{spool.location || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("spool.tag")}>
            {spool.tag ? (
              <Tag icon={<TagOutlined />}>{spool.tag}</Tag>
            ) : (
              <span style={{ color: "#999" }}>{t("spool.noTag")}</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={t("spool.detail.amsSlot")}>
            {isAssigned ? `AMS ${spool.ams_id} - Tray ${(spool.tray_index ?? 0) + 1}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("spool.lastUsed")}>{spool.last_used || "—"}</Descriptions.Item>
          <Descriptions.Item label={t("spool.detail.registered")}>{spool.registered || "—"}</Descriptions.Item>
        </Descriptions>

        {spool.filament_extra && Object.keys(spool.filament_extra).length > 0 && (
          <Card size="small" title={t("spool.detail.extra")} style={{ marginTop: 16 }}>
            <pre style={{ margin: 0, fontSize: 12 }}>
              {JSON.stringify(spool.filament_extra, null, 2)}
            </pre>
          </Card>
        )}
      </Card>
    </div>
  );
};
