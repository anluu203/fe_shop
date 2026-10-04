"use client";

import { useEffect, useState } from "react";
import { categoryApi } from "../../../lib/api/categories";
import type { Category, CategoryBody, CategoryParent, CategoryParentBody } from "../../../lib/types";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import { PageSpinner } from "../../../components/ui/Spinner";

export default function AdminCategoriesPage() {
  const [parents, setParents] = useState<CategoryParent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  // Parent modal
  const [parentModal, setParentModal] = useState<"create" | "edit" | null>(null);
  const [editParent, setEditParent] = useState<CategoryParent | null>(null);
  const [parentForm, setParentForm] = useState({ name: "", description: "" });
  const [parentSaving, setParentSaving] = useState(false);
  const [parentError, setParentError] = useState("");

  // Category modal
  const [catModal, setCatModal] = useState<"create" | "edit" | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", parentId: "" });
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([categoryApi.getParents(), categoryApi.getAll()]);
    setParents(p);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredCats = selectedParent
    ? categories.filter((c) => c.parentId === selectedParent)
    : categories;

  // --- Parent CRUD ---
  const openCreateParent = () => {
    setParentForm({ name: "", description: "" });
    setParentError("");
    setParentModal("create");
  };

  const openEditParent = (p: CategoryParent) => {
    setEditParent(p);
    setParentForm({ name: p.name, description: p.description ?? "" });
    setParentError("");
    setParentModal("edit");
  };

  const saveParent = async () => {
    if (!parentForm.name.trim()) { setParentError("Tên không được để trống"); return; }
    setParentSaving(true);
    setParentError("");
    try {
      if (parentModal === "create") {
        await categoryApi.createParent({ name: parentForm.name.trim(), description: parentForm.description.trim() || undefined });
      } else if (editParent) {
        await categoryApi.updateParent(editParent.id, { name: parentForm.name.trim(), description: parentForm.description.trim() || undefined });
      }
      setParentModal(null);
      load();
    } catch (err: any) {
      setParentError(err.message);
    } finally {
      setParentSaving(false);
    }
  };

  const deleteParent = async (id: string) => {
    if (!confirm("Xóa danh mục cha này? (Chỉ được xóa nếu không có danh mục con)")) return;
    try {
      await categoryApi.deleteParent(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- Category CRUD ---
  const openCreateCat = () => {
    setCatForm({ name: "", description: "", parentId: selectedParent ?? (parents[0]?.id ?? "") });
    setCatError("");
    setCatModal("create");
  };

  const openEditCat = (c: Category) => {
    setEditCat(c);
    setCatForm({ name: c.name, description: c.description ?? "", parentId: c.parentId });
    setCatError("");
    setCatModal("edit");
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { setCatError("Tên không được để trống"); return; }
    if (!catForm.parentId) { setCatError("Vui lòng chọn danh mục cha"); return; }
    setCatSaving(true);
    setCatError("");
    try {
      if (catModal === "create") {
        await categoryApi.create({ name: catForm.name.trim(), description: catForm.description.trim() || undefined, parentId: catForm.parentId });
      } else if (editCat) {
        await categoryApi.update(editCat.id, { name: catForm.name.trim(), description: catForm.description.trim() || undefined, parentId: catForm.parentId });
      }
      setCatModal(null);
      load();
    } catch (err: any) {
      setCatError(err.message);
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return;
    try {
      await categoryApi.delete(id);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Parents panel */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--primary-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--primary-dark)", display: "flex", alignItems: "center" }}>
              <i className="fa fa-folder-open" style={{ marginRight: 6 }} /> Danh mục cha ({parents.length})
            </h2>
            <button
              id="add-parent-btn"
              onClick={openCreateParent}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--primary)",
                background: "#fff",
                border: "1px solid var(--primary-border)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              <i className="fa fa-plus" style={{ marginRight: 4 }} /> Thêm
            </button>
          </div>
          <div>
            <button
              onClick={() => setSelectedParent(null)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: !selectedParent ? "var(--primary-bg)" : "none",
                border: "none",
                borderLeft: !selectedParent ? "3px solid var(--primary)" : "3px solid transparent",
                color: !selectedParent ? "var(--primary-dark)" : "var(--text-secondary)",
                fontWeight: !selectedParent ? 700 : 500,
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Tất cả ({categories.length})
            </button>
            {parents.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderLeft: selectedParent === p.id ? "3px solid var(--primary)" : "3px solid transparent",
                  background: selectedParent === p.id ? "var(--primary-bg)" : "none",
                }}
              >
                <button
                  id={`parent-${p.id}`}
                  onClick={() => setSelectedParent(p.id)}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "none",
                    border: "none",
                    color: selectedParent === p.id ? "var(--primary-dark)" : "var(--text-secondary)",
                    fontWeight: selectedParent === p.id ? 700 : 500,
                    fontSize: 13,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {p.name}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                    ({categories.filter((c) => c.parentId === p.id).length})
                  </span>
                </button>
                <div style={{ display: "flex", gap: 4, paddingRight: 10 }}>
                  <button
                    id={`edit-parent-${p.id}`}
                    onClick={() => openEditParent(p)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--primary-bg)",
                      color: "var(--primary-dark)",
                      border: "1px solid var(--primary-border)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <i className="fa fa-pencil" />
                  </button>
                  <button
                    id={`delete-parent-${p.id}`}
                    onClick={() => deleteParent(p.id)}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      background: "var(--danger-bg)",
                      color: "var(--danger)",
                      border: "1px solid var(--danger)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <i className="fa fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories panel */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-section)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-secondary)" }}>
              Danh mục con ({filteredCats.length})
            </h2>
            <Button id="add-category-btn" size="sm" onClick={openCreateCat}>
              <i className="fa fa-plus" style={{ marginRight: 4 }} /> Thêm danh mục
            </Button>
          </div>
          <div>
            {filteredCats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>
                Chưa có danh mục con
              </div>
            ) : (
              filteredCats.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderBottom: i < filteredCats.length - 1 ? "1px solid var(--border)" : "none",
                    gap: 12,
                    transition: "background var(--transition)",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "none")}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {c.parent?.name} {c.description && `· ${c.description}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      id={`edit-cat-${c.id}`}
                      onClick={() => openEditCat(c)}
                      style={{
                        padding: "5px 10px",
                        background: "var(--primary-bg)",
                        color: "var(--primary-dark)",
                        border: "1px solid var(--primary-border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      <i className="fa fa-pencil" /> Sửa
                    </button>
                    <button
                      id={`delete-cat-${c.id}`}
                      onClick={() => deleteCat(c.id)}
                      style={{
                        padding: "5px 10px",
                        background: "var(--danger-bg)",
                        color: "var(--danger)",
                        border: "1px solid var(--danger)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      <i className="fa fa-trash" /> Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Parent modal */}
      <Modal
        open={!!parentModal}
        onClose={() => setParentModal(null)}
        title={parentModal === "create" ? "Thêm danh mục cha" : "Sửa danh mục cha"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setParentModal(null)}>Hủy</Button>
            <Button id="save-parent-btn" loading={parentSaving} onClick={saveParent}>Lưu</Button>
          </>
        }
      >
        {parentError && (
          <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {parentError}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input
            id="parent-name"
            label="Tên danh mục *"
            value={parentForm.name}
            onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
          />
          <Input
            id="parent-description"
            label="Mô tả"
            value={parentForm.description}
            onChange={(e) => setParentForm({ ...parentForm, description: e.target.value })}
          />
        </div>
      </Modal>

      {/* Category modal */}
      <Modal
        open={!!catModal}
        onClose={() => setCatModal(null)}
        title={catModal === "create" ? "Thêm danh mục con" : "Sửa danh mục con"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCatModal(null)}>Hủy</Button>
            <Button id="save-cat-btn" loading={catSaving} onClick={saveCat}>Lưu</Button>
          </>
        }
      >
        {catError && (
          <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 14, fontWeight: 600 }}>
            <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {catError}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
              Danh mục cha *
            </label>
            <select
              id="cat-parent-select"
              value={catForm.parentId}
              onChange={(e) => setCatForm({ ...catForm, parentId: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 14,
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="">-- Chọn --</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <Input
            id="cat-name"
            label="Tên danh mục *"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
          />
          <Input
            id="cat-description"
            label="Mô tả"
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
