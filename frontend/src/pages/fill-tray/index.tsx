import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Result,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { useList, useCustomMutation, useGo } from "@refinedev/core";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Spool } from "../../types";
import { ColorBadge } from "../../components/common/ColorBadge";

const { Title } = Typography;
const { Search } = Input;

/** Sentinel ams_id used by the backend for the printer's external spool slot. */
const EXTERNAL_SPOOL_AMS_ID = 255;

/** Squared Euclidean distance in RGB — used to sort matching colors first. */
function colorDistance(a: string, b: string): number {
  const toRgb = (hex: string) => {
    const clean = hex.replace("#", "").padEnd(6, "0");
    return {
      r: parseInt(clean.substring(0, 2), 16) || 0,
      g: parseInt(clean.substring(2, 4), 16) || 0,
      b: parseInt(clean.substring(4, 6), 16) || 0,
    };
  };
  const c1 = toRgb(a);
  const c2 = toRgb(b);
  return (
    (c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2
  );
}

export const FillTrayPage: React.FC = () => {
  const { t } = useTranslation();
  const go = useGo();
  const [searchParams] = useSearchParams();

  const amsId = searchParams.get("ams");
  const trayId = searchParams.get("tray");
  const trayMaterial = searchParams.get("material") || undefined;
  const trayColor = searchParams.get("color") || undefined;

  const [searchText, setSearchText] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string | undefined>(
    trayMaterial,
  );
  const [assignedFilter, setAssignedFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null);

  const listResult = useList<Spool>({ resource: "spools" });
  const spools = listResult.result?.data || [];
  const isLoading = listResult.query?.isLoading;

  const mutationResult = useCustomMutation();
  const isAssigning = mutationResult.mutation?.isPending;

  const materials = Array.from(
    new Set(spools.map((s) => s.material).filter(Boolean)),
  );

  const filtered = spools.filter((spool) => {
    if (materialFilter && spool.material !== materialFilter) return false;
    if (assignedFilter === "assigned" && !spool.tag) return false;
    if (assignedFilter === "unassigned" && spool.tag) return false;
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      spool.name?.toLowerCase().includes(q) ||
      spool.material?.toLowerCase().includes(q) ||
      spool.vendor?.toLowerCase().includes(q)
    );
  });

  const sorted = trayColor
    ? [...filtered].sort((a, b) => {
        const cA = Array.isArray(a.color) ? a.color[0] : a.color;
        const cB = Array.isArray(b.color) ? b.color[0] : b.color;
        return colorDistance(cA, trayColor) - colorDistance(cB, trayColor);
      })
    : filtered;

  const handleAssign = () => {
    if (!selectedSpool || !amsId || !trayId) return;
    const spool = spools.find((s) => s.id === selectedSpool);
    mutationResult.mutate(
      {
        url: `/api/v1/printers/PRINTER_1/ams/${trayId}/assign`,
        method: "post",
        values: {
          spool_id: parseInt(selectedSpool),
          ams_id: parseInt(amsId),
        },
      },
      {
        onSuccess: () => {
          message.success(t("fill.success", { spool: spool?.name }));
          go({ to: "/" });
        },
        onError: (error) => {
          message.error(error?.message || t("error.saveFailed"));
        },
      },
    );
  };

  const isExternal = amsId != null && parseInt(amsId) === EXTERNAL_SPOOL_AMS_ID;
  const slotLabel = isExternal
    ? t("home.externalSpool")
    : `AMS ${parseInt(amsId ?? "0") + 1}, ${t("home.tray")} ${parseInt(trayId ?? "0") + 1}`;

  if (!amsId || !trayId) {
    return (
      <Result
        status="warning"
        title={t("error.notFound")}
        subTitle="No tray specified"
        extra={
          <Button type="primary" onClick={() => go({ to: "/" })}>
            {t("common.back")}
          </Button>
        }
      />
    );
  }

  const columns = [
    {
      title: t("spool.color"),
      dataIndex: "color",
      key: "color",
      width: 60,
      render: (color: string | string[]) => (
        <ColorBadge color={color} size={24} />
      ),
    },
    { title: t("spool.name"), dataIndex: "name", key: "name" },
    {
      title: t("spool.material"),
      dataIndex: "material",
      key: "material",
      render: (m: string) => <Tag>{m}</Tag>,
    },
    { title: t("spool.vendor"), dataIndex: "vendor", key: "vendor" },
    {
      title: t("spool.remaining"),
      dataIndex: "remaining_g",
      key: "remaining_g",
      render: (r: number | null) => (r != null ? `${r.toFixed(0)}g` : "—"),
    },
  ];

  return (
    <div>
      <Title level={2}>{t("fill.title")}</Title>

      <Card style={{ marginBottom: 24 }}>
        <Alert
          type="info"
          message={t("fill.title")}
          description={
            <div>
              <p>{t("fill.pickSpool")}</p>
              <Descriptions column={2} size="small" style={{ marginTop: 8 }}>
                <Descriptions.Item label={t("home.tray")}>
                  {slotLabel}
                </Descriptions.Item>
                {trayMaterial && (
                  <Descriptions.Item label={t("spool.material")}>
                    <Tag>{trayMaterial}</Tag>
                  </Descriptions.Item>
                )}
                {trayColor && (
                  <Descriptions.Item label={t("spool.color")}>
                    <Space>
                      <ColorBadge color={trayColor} size={20} />
                      <code style={{ fontSize: 11 }}>{trayColor}</code>
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          }
          showIcon
        />
      </Card>

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
            value={materialFilter}
            onChange={(v) => setMaterialFilter(v)}
            options={materials.map((m) => ({ label: m, value: m }))}
          />
          <Select
            style={{ width: 180 }}
            value={assignedFilter}
            onChange={(v) => setAssignedFilter(v)}
            options={[
              { label: t("common.all"), value: "all" },
              { label: t("spool.assigned"), value: "assigned" },
              { label: t("spool.notAssigned"), value: "unassigned" },
            ]}
          />
        </Space>
      </Card>

      <Table<Spool>
        dataSource={sorted}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        rowSelection={{
          type: "radio",
          selectedRowKeys: selectedSpool ? [selectedSpool] : [],
          onChange: (keys) => setSelectedSpool(keys[0] as string),
        }}
        onRow={(record) => ({
          onClick: () => setSelectedSpool(record.id),
          style: { cursor: "pointer" },
        })}
      />

      <Card style={{ marginTop: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleAssign}
            disabled={!selectedSpool}
            loading={isAssigning}
          >
            {t("home.assign")}
          </Button>
          <Button onClick={() => go({ to: "/" })}>{t("common.cancel")}</Button>
        </Space>
      </Card>
    </div>
  );
};
