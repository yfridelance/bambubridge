import { useState } from "react";
import {
  Table,
  Card,
  Button,
  Space,
  Typography,
  Tag,
  Select,
  Input,
  Alert,
  message,
} from "antd";
import { useList, useCustomMutation, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { TagOutlined, EditOutlined, LinkOutlined } from "@ant-design/icons";
import type { Spool } from "../../types";
import { ColorBadge } from "../../components/common/ColorBadge";

const { Title } = Typography;
const { Search } = Input;

export const TagsPage: React.FC = () => {
  const { t } = useTranslation();
  const go = useGo();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string | undefined>();

  const action = searchParams.get("action");
  const amsId = searchParams.get("ams");
  const trayId = searchParams.get("tray");

  const listResult = useList<Spool>({
    resource: "spools",
  });
  const data = listResult.result;
  const isLoading = listResult.query?.isLoading;

  const mutationResult = useCustomMutation();
  const assignSpool = mutationResult.mutate;
  const isAssigning = mutationResult.mutation?.isPending;

  // Get unique materials
  const materials = new Set<string>();
  (data?.data || []).forEach((spool: Spool) => {
    if (spool.material) materials.add(spool.material);
  });

  // Filter spools
  const filteredData = (data?.data || []).filter((spool: Spool) => {
    if (materialFilter && spool.material !== materialFilter) return false;
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      spool.name?.toLowerCase().includes(search) ||
      spool.material?.toLowerCase().includes(search) ||
      spool.vendor?.toLowerCase().includes(search)
    );
  });

  // Sort: untagged first if assigning tag
  const sortedData = [...filteredData].sort((a, b) => {
    if (action === "assign_tag") {
      if (!a.tag && b.tag) return -1;
      if (a.tag && !b.tag) return 1;
    }
    return 0;
  });

  const handleAssignToTray = async (spoolId: string) => {
    if (!amsId || !trayId) return;

    assignSpool(
      {
        url: `/api/v1/printers/PRINTER_1/ams/${trayId}/assign`,
        method: "post",
        values: { spool_id: parseInt(spoolId), ams_id: parseInt(amsId) },
      },
      {
        onSuccess: () => {
          message.success(t("tag.tagLinked"));
          go({ to: "/" });
        },
        onError: (error) => {
          message.error(error?.message || t("error.saveFailed"));
        },
      }
    );
  };

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
    },
    {
      title: t("spool.material"),
      dataIndex: "material",
      key: "material",
      render: (material: string) => <Tag>{material}</Tag>,
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
      render: (remaining: number | null) =>
        remaining !== null ? `${remaining.toFixed(0)}g` : "-",
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
      title: "",
      key: "actions",
      width: 200,
      render: (_: unknown, record: Spool) => (
        <Space>
          {action === "fill" && amsId && trayId ? (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => handleAssignToTray(record.id)}
              loading={isAssigning}
            >
              {t("home.assign")}
            </Button>
          ) : (
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => go({ to: `/tags/write/${record.id}` })}
            >
              {t("tag.writeTag")}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>{t("tag.title")}</Title>

      {action === "fill" && amsId && trayId && (
        <Alert
          type="info"
          message={`${t("home.fill")}: AMS ${amsId}, Tray ${parseInt(trayId) + 1}`}
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

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
        dataSource={sortedData}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export const WriteTagPage: React.FC = () => {
  const { t } = useTranslation();
  // TODO: Implement NFC tag writing
  return (
    <div>
      <Title level={2}>{t("tag.writeTag")}</Title>
      <Alert
        type="info"
        message="NFC tag writing requires Android Chrome with Web NFC API support."
        showIcon
      />
      <p>Write tag page - coming soon</p>
    </div>
  );
};

export const LinkBambuPage: React.FC = () => {
  const { t } = useTranslation();
  // TODO: Implement Bambu tag linking
  return (
    <div>
      <Title level={2}>{t("tag.linkBambu")}</Title>
      <p>Link Bambu spool page - coming soon</p>
    </div>
  );
};
