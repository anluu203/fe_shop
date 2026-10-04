"use client";

import { useEffect, useState } from "react";
import { storeApi } from "../../../lib/api/stores";
import type { Store } from "../../../lib/types";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { PageSpinner } from "../../../components/ui/Spinner";
import { formatDate } from "../../../lib/utils/format";

const EMPTY_FORM = { name: "", description: "", address: "", imageUrl: "" };

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    storeApi.getAll().then(setStores).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError("");
    setModal("create");
  };

  const openEdit = (s: Store) => {
    setEditStore(s);
    setForm({ name: s.name, description: s.description, address: s.address, imageUrl: s.imageUrl });
    setError("");
    setModal("edit");
  };

  const validate = () => {
    if (!form.name.trim()) { setError("Tên cửa hàng không được để trống"); return false; }
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        await storeApi.create({ name: form.name, description: form.description, address: form.address, imageUrl: form.imageUrl });
      } else if (editStore) {
        await storeApi.update(editStore.id, { name: form.name, description: form.description, address: form.address, imageUrl: form.imageUrl });
      }
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.message ?? "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa cửa hàng này?")) return;
    try {
      await storeApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  if (loading) return <PageSpinner />;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <Button id="add-store-btn" onClick={openCreate} icon={<i className="fa fa-plus" />}>
          Thêm cửa hàng
        </Button>
      </div>

      {/* Grid */}
      {stores.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}><i className="fa fa-building-o" /></div>
          <p>Chưa có cửa hàng nào</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {stores.map((store) => (
            <div
              key={store.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                transition: "all var(--transition)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              }}
            >
              {/* Store image */}
              <div
                style={{
                  height: 140,
                  background: "linear-gradient(135deg, var(--primary-bg) 0%, var(--bg-section) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {store.imageUrl ? (
                  <img
                    src={store.imageUrl}
                    alt={store.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 48, opacity: 0.3 }}><i className="fa fa-building-o" /></span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "16px" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  {store.name}
                </h3>
                {store.description && (
                  <p className="line-clamp-2" style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>
                    {store.description}
                  </p>
                )}
                {store.address && (
                  <div style={{ display: "flex", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, alignItems: "center" }}>
                    <i className="fa fa-map-marker" style={{ width: 14, textAlign: "center" }} />
                    <span className="line-clamp-1">{store.address}</span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-disabled)", marginBottom: 14 }}>
                  Tạo: {formatDate(store.createdAt)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    id={`edit-store-${store.id}`}
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(store)}
                    fullWidth
                  >
                    <i className="fa fa-pencil" style={{ marginRight: 4 }} /> Sửa
                  </Button>
                  <Button
                    id={`delete-store-${store.id}`}
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(store.id)}
                    fullWidth
                  >
                    <i className="fa fa-trash" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Thêm cửa hàng" : "Sửa cửa hàng"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Hủy</Button>
            <Button id="save-store-btn" loading={saving} onClick={save}>
              <i className="fa fa-floppy-o" style={{ marginRight: 4 }} /> Lưu
            </Button>
          </>
        }
      >
        {error && (
          <div style={{ color: "var(--danger)", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {error}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input id="store-name" label="Tên cửa hàng *" value={form.name} onChange={set("name")} />
          <Input id="store-description" label="Mô tả" value={form.description} onChange={set("description")} />
          <Input id="store-address" label="Địa chỉ" value={form.address} onChange={set("address")} icon={<i className="fa fa-map-marker" />} />
          <Input id="store-imageUrl" label="URL ảnh" value={form.imageUrl} onChange={set("imageUrl")} icon={<i className="fa fa-picture-o" />} />
        </div>
      </Modal>
    </div>
  );
}
