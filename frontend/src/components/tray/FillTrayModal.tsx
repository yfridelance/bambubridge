import { useState } from "react";
import {
  Modal,
  Input,
  Select,
  Table,
  Button,
  Tag,
  Space,
  Alert,
  message,
} from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { useList, useCustomMutation } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import type { Spool } from "../../types";
import { ColorBadge } from "../common/ColorBadge";

const { Search } = Input;

interface FillTrayModalProps {
  open: boolean;
  amsId: number;
  trayIndex: number;
  /** Color the printer has set on the slot (used to suggest a matching spool). */
  trayColor?: string;
  onClose: () => void;
  onAssigned?: () => void;
}

export const FillTrayModal: React.FC<FillTrayModalProps> = ({
  open,
  amsId,
  trayIndex,
  trayColor,
  onClose,
  onAssigned,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string | undefined>();

  const listResult = useList<Spool>({
    resource: "spools",
    queryOptions: { enabled: open },
  });
  const spools = listResult.result?.data || [];
  const isLoading = listResult.query?.isLoading;

  const mutationResult = useCustomMutation();
  const isAssigning = mutationResult.mutation?.isPending;

  const materials = Array.from(
    new Set(spools.map((s) => s.material).filter(Boolean)),
  );

  const filtered = spools.filter((spool) => {
    if (materialFilter && spool.material !== materialFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      spool.name?.toLowerCase().includes(q) ||
      spool.material?.toLowerCase().includes(q) ||
      spool.vendor?.toLowerCase().includes(q)
    );
  });

  const handleAssign = (spool: Spool) => {
    mutationResult.mutate(
      {
        url: `/api/v1/printers/PRINTER_1/ams/${trayIndex}/assign`,
        method: "post",
        values: { spool_id: parseInt(spool.id), ams_id: amsId },
      },
      {
        onSuccess: () => {
          message.success(t("fill.success", { spool: spool.name }));
          onAssigned?.();
          onClose();
        },
        onError: (error) => {
          message.error(error?.message || t("error.saveFailed"));
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      title={`${t("fill.title")}: AMS ${amsId}, ${t("home.tray")} ${trayIndex + 1}`}
      destroyOnHidden
    >
      {trayColor && (
        <Alert
          type="info"
          message={
            <Space>
              <span>{t("fill.detectedColor")}:</span>
              <ColorBadge color={trayColor} size={20} />
              <code>{trayColor}</code>
            </Space>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Space wrap style={{ marginBottom: 16 }}>
        <Search
          placeholder={t("common.search")}
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        <Select
          placeholder={t("spool.material")}
          allowClear
          style={{ width: 160 }}
          onChange={(v) => setMaterialFilter(v)}
          options={materials.map((m) => ({ label: m, value: m }))}
        />
      </Space>

      <Table<Spool>
        dataSource={filtered}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          {
            title: t("spool.color"),
            dataIndex: "color",
            key: "color",
            width: 60,
            render: (color: string | string[]) => (
              <ColorBadge color={color} size={20} />
            ),
          },
          { title: t("spool.name"), dataIndex: "name", key: "name" },
          {
            title: t("spool.material"),
            dataIndex: "material",
            key: "material",
            render: (m: string) => <Tag>{m}</Tag>,
          },
          {
            title: t("spool.vendor"),
            dataIndex: "vendor",
            key: "vendor",
          },
          {
            title: t("spool.remaining"),
            dataIndex: "remaining_g",
            key: "remaining_g",
            render: (r: number | null) =>
              r != null ? `${r.toFixed(0)}g` : "—",
          },
          {
            title: "",
            key: "actions",
            width: 130,
            render: (_, record) => (
              <Button
                type="primary"
                icon={<LinkOutlined />}
                onClick={() => handleAssign(record)}
                loading={isAssigning}
              >
                {t("home.assign")}
              </Button>
            ),
          },
        ]}
      />
    </Modal>
  );
};
