import { useState, useCallback } from "react";
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
  Steps,
  Result,
  Spin,
  Descriptions,
  Modal,
} from "antd";
import { useList, useOne, useCustomMutation, useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { useSearchParams, useParams } from "react-router-dom";
import {
  TagOutlined,
  EditOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  MobileOutlined,
} from "@ant-design/icons";
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

  const handleAssignToTray = async (spool: Spool) => {
    if (!amsId || !trayId) return;

    Modal.confirm({
      title: t("fill.confirmTitle"),
      content: t("fill.confirmMessage", {
        spool: spool.name,
        tray: parseInt(trayId) + 1,
        ams: amsId,
      }),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: () => {
        assignSpool(
          {
            url: `/api/v1/printers/PRINTER_1/ams/${trayId}/assign`,
            method: "post",
            values: { spool_id: parseInt(spool.id), ams_id: parseInt(amsId) },
          },
          {
            onSuccess: () => {
              message.success(t("fill.success", { spool: spool.name }));
              go({ to: "/" });
            },
            onError: (error) => {
              message.error(error?.message || t("error.saveFailed"));
            },
          }
        );
      },
    });
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
              onClick={() => handleAssignToTray(record)}
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

type WriteStatus = "idle" | "generating" | "ready" | "writing" | "assigning" | "success" | "error";

export const WriteTagPage: React.FC = () => {
  const { t } = useTranslation();
  const go = useGo();
  const { spoolId } = useParams<{ spoolId: string }>();

  const [status, setStatus] = useState<WriteStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [tagId, setTagId] = useState<string>("");
  const [tagUrl, setTagUrl] = useState<string>("");

  // Fetch spool data
  const spoolResult = useOne<Spool>({
    resource: "spools",
    id: spoolId || "",
    queryOptions: { enabled: !!spoolId },
  });
  const spool = spoolResult.result;
  const spoolLoading = spoolResult.query?.isLoading;

  const { mutate: generateTag } = useCustomMutation();
  const { mutate: assignTag } = useCustomMutation();

  // Check for Web NFC support
  const hasNfcSupport = "NDEFReader" in window;

  const handleGenerateTag = useCallback(() => {
    setStatus("generating");
    setErrorMessage("");

    generateTag(
      {
        url: "/api/v1/tags/generate",
        method: "post",
        values: {},
      },
      {
        onSuccess: (response) => {
          const data = response?.data as { data?: { tag_id?: string; tag_url?: string } };
          const newTagId = data?.data?.tag_id;
          const newTagUrl = data?.data?.tag_url;
          if (newTagId && newTagUrl) {
            setTagId(newTagId);
            setTagUrl(newTagUrl);
            setStatus("ready");
          } else {
            setStatus("error");
            setErrorMessage(t("tag.generateFailed"));
          }
        },
        onError: (error) => {
          setStatus("error");
          setErrorMessage(error?.message || t("tag.generateFailed"));
        },
      }
    );
  }, [generateTag, t]);

  const handleWriteNfc = useCallback(async () => {
    if (!tagUrl || !hasNfcSupport) return;

    setStatus("writing");
    setErrorMessage("");

    try {
      // @ts-expect-error NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader();
      await ndef.write({
        records: [{ recordType: "url", data: tagUrl }],
      });

      // NFC write successful, now assign tag to spool
      setStatus("assigning");

      assignTag(
        {
          url: `/api/v1/spools/${spoolId}/tag`,
          method: "post",
          values: { tag_id: tagId },
        },
        {
          onSuccess: () => {
            setStatus("success");
            message.success(t("tag.tagWritten"));
          },
          onError: (error) => {
            setStatus("error");
            setErrorMessage(error?.message || t("tag.assignFailed"));
          },
        }
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : t("tag.writeFailed")
      );
    }
  }, [tagUrl, tagId, spoolId, hasNfcSupport, assignTag, t]);

  const currentStep =
    status === "idle" ? 0 :
    status === "generating" ? 0 :
    status === "ready" ? 1 :
    status === "writing" ? 2 :
    status === "assigning" ? 2 :
    status === "success" ? 3 :
    status === "error" ? -1 : 0;

  if (spoolLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!spool) {
    return (
      <Result
        status="404"
        title={t("error.notFound")}
        subTitle={t("spool.notFound")}
        extra={
          <Button type="primary" onClick={() => go({ to: "/tags" })}>
            {t("common.back")}
          </Button>
        }
      />
    );
  }

  if (!hasNfcSupport) {
    return (
      <div>
        <Title level={2}>{t("tag.writeTag")}</Title>
        <Alert
          type="error"
          message={t("tag.nfcNotSupported")}
          description={t("tag.nfcNotSupportedDesc")}
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Button onClick={() => go({ to: "/tags" })}>{t("common.back")}</Button>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>{t("tag.writeTag")}</Title>

      {/* Spool Info */}
      <Card style={{ marginBottom: 24 }}>
        <Descriptions column={2} size="small">
          <Descriptions.Item label={t("spool.name")}>{spool.name}</Descriptions.Item>
          <Descriptions.Item label={t("spool.vendor")}>{spool.vendor}</Descriptions.Item>
          <Descriptions.Item label={t("spool.material")}>
            <Tag>{spool.material}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label={t("spool.color")}>
            <ColorBadge color={spool.color} size={20} />
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Steps */}
      <Card style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          status={status === "error" ? "error" : undefined}
          items={[
            {
              title: t("tag.stepGenerate"),
              icon: status === "generating" ? <LoadingOutlined /> : undefined,
            },
            {
              title: t("tag.stepPrepare"),
            },
            {
              title: t("tag.stepWrite"),
              icon: status === "writing" || status === "assigning" ? <LoadingOutlined /> : undefined,
            },
            {
              title: t("tag.stepDone"),
              icon: status === "success" ? <CheckCircleOutlined /> : undefined,
            },
          ]}
        />
      </Card>

      {/* Status-specific content */}
      {status === "idle" && (
        <Card>
          <Alert
            type="info"
            message={t("tag.instructions")}
            description={
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                <li>{t("tag.instruction1")}</li>
                <li>{t("tag.instruction2")}</li>
                <li>{t("tag.instruction3")}</li>
              </ul>
            }
            showIcon
            icon={<MobileOutlined />}
            style={{ marginBottom: 24 }}
          />
          <Button type="primary" size="large" onClick={handleGenerateTag}>
            {t("tag.startWriting")}
          </Button>
        </Card>
      )}

      {status === "generating" && (
        <Card>
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>{t("tag.generatingTag")}</p>
          </div>
        </Card>
      )}

      {status === "ready" && (
        <Card>
          <Alert
            type="warning"
            message={t("tag.readyToWrite")}
            description={t("tag.bringTagCloser")}
            showIcon
            style={{ marginBottom: 24 }}
          />
          <div style={{ textAlign: "center" }}>
            <Button
              type="primary"
              size="large"
              icon={<TagOutlined />}
              onClick={handleWriteNfc}
            >
              {t("tag.writeToTag")}
            </Button>
          </div>
        </Card>
      )}

      {(status === "writing" || status === "assigning") && (
        <Card>
          <div style={{ textAlign: "center", padding: 24 }}>
            <Spin size="large" />
            <p style={{ marginTop: 16 }}>
              {status === "writing" ? t("tag.writingTag") : t("tag.assigningTag")}
            </p>
          </div>
        </Card>
      )}

      {status === "success" && (
        <Result
          status="success"
          title={t("tag.tagWritten")}
          subTitle={t("tag.tagWrittenDesc")}
          extra={[
            <Button type="primary" key="back" onClick={() => go({ to: "/tags" })}>
              {t("common.back")}
            </Button>,
          ]}
        />
      )}

      {status === "error" && (
        <Result
          status="error"
          title={t("tag.writeFailed")}
          subTitle={errorMessage}
          extra={[
            <Button type="primary" key="retry" onClick={handleGenerateTag}>
              {t("tag.retry")}
            </Button>,
            <Button key="back" onClick={() => go({ to: "/tags" })}>
              {t("common.back")}
            </Button>,
          ]}
        />
      )}
    </div>
  );
};

export const LinkBambuPage: React.FC = () => {
  const { t } = useTranslation();
  const go = useGo();
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string | undefined>(
    searchParams.get("material") || undefined
  );
  const [assignedFilter, setAssignedFilter] = useState<"all" | "assigned" | "unassigned">("unassigned");
  const [selectedSpool, setSelectedSpool] = useState<string | null>(null);

  const bambuTag = searchParams.get("tag");
  const amsId = searchParams.get("ams");
  const trayId = searchParams.get("tray");
  const trayMaterial = searchParams.get("material");
  const trayColor = searchParams.get("color");

  const listResult = useList<Spool>({
    resource: "spools",
  });
  const spoolsData = listResult.result;
  const isLoading = listResult.query?.isLoading;

  const mutationResult = useCustomMutation();
  const linkTag = mutationResult.mutate;
  const isLinking = mutationResult.mutation?.isPending;

  // Get unique materials
  const materials = new Set<string>();
  (spoolsData?.data || []).forEach((spool: Spool) => {
    if (spool.material) materials.add(spool.material);
  });

  // Helper to calculate color distance (lower = more similar)
  const getColorDistance = (color1: string, color2: string): number => {
    const hexToRgb = (hex: string) => {
      const clean = hex.replace("#", "");
      return {
        r: parseInt(clean.substring(0, 2), 16) || 0,
        g: parseInt(clean.substring(2, 4), 16) || 0,
        b: parseInt(clean.substring(4, 6), 16) || 0,
      };
    };
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  };

  // Filter spools
  const filteredData = (spoolsData?.data || []).filter((spool: Spool) => {
    if (materialFilter && spool.material !== materialFilter) return false;
    if (assignedFilter === "assigned" && !spool.tag) return false;
    if (assignedFilter === "unassigned" && spool.tag) return false;
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      spool.name?.toLowerCase().includes(search) ||
      spool.material?.toLowerCase().includes(search) ||
      spool.vendor?.toLowerCase().includes(search)
    );
  });

  // Sort by color similarity if trayColor is provided
  const sortedData = trayColor
    ? [...filteredData].sort((a, b) => {
        const colorA = Array.isArray(a.color) ? a.color[0] : a.color;
        const colorB = Array.isArray(b.color) ? b.color[0] : b.color;
        return getColorDistance(colorA, trayColor) - getColorDistance(colorB, trayColor);
      })
    : filteredData;

  const handleLink = () => {
    if (!selectedSpool || !bambuTag) return;

    linkTag(
      {
        url: "/api/v1/tags/link-bambu",
        method: "post",
        values: {
          bambu_tag: bambuTag,
          spool_id: parseInt(selectedSpool),
          ams_id: amsId ? parseInt(amsId) : undefined,
          tray_id: trayId ? parseInt(trayId) : undefined,
        },
      },
      {
        onSuccess: () => {
          message.success(t("tag.linkSuccess"));
          go({ to: "/" });
        },
        onError: (error) => {
          message.error(error?.message || t("tag.linkFailed"));
        },
      }
    );
  };

  if (!bambuTag) {
    return (
      <Result
        status="warning"
        title={t("error.notFound")}
        subTitle="No Bambu tag specified"
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
  ];

  return (
    <div>
      <Title level={2}>{t("tag.linkBambu")}</Title>

      {/* Bambu Tag Info */}
      <Card style={{ marginBottom: 24 }}>
        <Alert
          type="info"
          message={t("alert.unmappedTag")}
          description={
            <div>
              <p>{t("tag.selectSpool")}</p>
              <Descriptions column={2} size="small" style={{ marginTop: 8 }}>
                {amsId && trayId && (
                  <Descriptions.Item label={t("home.tray")}>
                    AMS {parseInt(amsId) + 1}, Tray {parseInt(trayId) + 1}
                  </Descriptions.Item>
                )}
                {trayMaterial && (
                  <Descriptions.Item label={t("spool.material")}>
                    <Tag>{trayMaterial}</Tag>
                  </Descriptions.Item>
                )}
                {trayColor && (
                  <Descriptions.Item label={t("spool.color")}>
                    <ColorBadge color={trayColor} size={20} />
                  </Descriptions.Item>
                )}
                <Descriptions.Item label={t("tag.bambuTagId")}>
                  <code style={{ fontSize: 11 }}>{bambuTag}</code>
                </Descriptions.Item>
              </Descriptions>
            </div>
          }
          showIcon
        />
      </Card>

      {/* Filters */}
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
            onChange={(value) => setMaterialFilter(value)}
            options={Array.from(materials).map((m) => ({ label: m, value: m }))}
          />
          <Select
            style={{ width: 180 }}
            value={assignedFilter}
            onChange={(value) => setAssignedFilter(value)}
            options={[
              { label: t("common.all"), value: "all" },
              { label: t("spool.assigned"), value: "assigned" },
              { label: t("spool.notAssigned"), value: "unassigned" },
            ]}
          />
        </Space>
      </Card>

      {/* Spool Selection Table */}
      <Table
        dataSource={sortedData}
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

      {/* Actions */}
      <Card style={{ marginTop: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={handleLink}
            disabled={!selectedSpool}
            loading={isLinking}
          >
            {t("tag.linkBambu")}
          </Button>
          <Button onClick={() => go({ to: "/" })}>{t("common.cancel")}</Button>
        </Space>
      </Card>
    </div>
  );
};
