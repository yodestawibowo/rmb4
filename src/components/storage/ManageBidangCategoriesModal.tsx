import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { BidangCategory } from '../../types';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  FolderOpen,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';

interface ManageBidangCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS: { id: string; name: string; bgClass: string; textClass: string; ringClass: string }[] = [
  { id: 'indigo', name: 'Indigo', bgClass: 'bg-indigo-100', textClass: 'text-indigo-800', ringClass: 'ring-indigo-500' },
  { id: 'emerald', name: 'Emerald', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800', ringClass: 'ring-emerald-500' },
  { id: 'blue', name: 'Biru', bgClass: 'bg-blue-100', textClass: 'text-blue-800', ringClass: 'ring-blue-500' },
  { id: 'purple', name: 'Ungu', bgClass: 'bg-purple-100', textClass: 'text-purple-800', ringClass: 'ring-purple-500' },
  { id: 'amber', name: 'Amber', bgClass: 'bg-amber-100', textClass: 'text-amber-800', ringClass: 'ring-amber-500' },
  { id: 'rose', name: 'Rose', bgClass: 'bg-rose-100', textClass: 'text-rose-800', ringClass: 'ring-rose-500' },
  { id: 'teal', name: 'Teal', bgClass: 'bg-teal-100', textClass: 'text-teal-800', ringClass: 'ring-teal-500' },
  { id: 'cyan', name: 'Cyan', bgClass: 'bg-cyan-100', textClass: 'text-cyan-800', ringClass: 'ring-cyan-500' },
];

export const ManageBidangCategoriesModal: React.FC<ManageBidangCategoriesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    bidangCategories,
    addBidangCategory,
    updateBidangCategory,
    deleteBidangCategory,
    items,
  } = useStorage();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BidangCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<BidangCategory | null>(null);
  const [reassignCategoryName, setReassignCategoryName] = useState<string>('');

  // Form states for Add
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('indigo');

  // Form states for Edit
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('indigo');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const getItemCount = (categoryName: string) => {
    return items.filter(
      (item) => item.scope === 'bidang' && item.bidangCategory === categoryName
    ).length;
  };

  const handleStartAdd = () => {
    setIsAddOpen(true);
    setEditingCategory(null);
    setDeletingCategory(null);
    setNewName('');
    setNewDesc('');
    setNewColor('indigo');
    setErrorMsg('');
  };

  const handleCancelAdd = () => {
    setIsAddOpen(false);
    setNewName('');
    setNewDesc('');
    setErrorMsg('');
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotification('Nama kategori bidang tidak boleh kosong.', true);
      return;
    }

    const res = await addBidangCategory(newName.trim(), newDesc.trim(), newColor);
    if (!res.success) {
      showNotification(res.message || 'Gagal menambahkan kategori.', true);
      return;
    }

    showNotification(`Kategori "${newName.trim()}" berhasil ditambahkan!`);
    setIsAddOpen(false);
    setNewName('');
    setNewDesc('');
    setNewColor('indigo');
  };

  const handleStartEdit = (cat: BidangCategory) => {
    setEditingCategory(cat);
    setIsAddOpen(false);
    setDeletingCategory(null);
    setEditName(cat.name);
    setEditDesc(cat.description || '');
    setEditColor(cat.color || 'indigo');
    setErrorMsg('');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditName('');
    setEditDesc('');
    setErrorMsg('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editName.trim()) {
      showNotification('Nama kategori bidang tidak boleh kosong.', true);
      return;
    }

    const res = await updateBidangCategory(
      editingCategory.id,
      editName.trim(),
      editDesc.trim(),
      editColor
    );

    if (!res.success) {
      showNotification(res.message || 'Gagal memperbarui kategori.', true);
      return;
    }

    showNotification(`Kategori "${editName.trim()}" berhasil diperbarui!`);
    setEditingCategory(null);
  };

  const handleStartDelete = (cat: BidangCategory) => {
    if (bidangCategories.length <= 1) {
      showNotification('Minimal harus ada 1 kategori bidang di sistem.', true);
      return;
    }
    setDeletingCategory(cat);
    const others = bidangCategories.filter((c) => c.id !== cat.id);
    setReassignCategoryName(others[0]?.name || '');
    setErrorMsg('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    const res = await deleteBidangCategory(deletingCategory.id, reassignCategoryName);
    if (!res.success) {
      showNotification(res.message || 'Gagal menghapus kategori.', true);
      return;
    }

    showNotification(`Kategori "${deletingCategory.name}" berhasil dihapus.`);
    setDeletingCategory(null);
  };

  const getColorClass = (colorId?: string) => {
    const match = COLOR_OPTIONS.find((c) => c.id === colorId);
    return match ? `${match.bgClass} ${match.textClass}` : 'bg-indigo-100 text-indigo-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Kelola Kategori Bidang
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {bidangCategories.length} Kategori
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaturan kategori bidang untuk arsip &amp; folder pada Menu Bidang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Notification Messages */}
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top action bar: Button to trigger Add Form */}
          {!isAddOpen && !editingCategory && !deletingCategory && (
            <div className="mb-5 flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Kategori bidang digunakan saat pembuatan folder baru, upload file, dan filter Menu Bidang.
                </span>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            </div>
          )}

          {/* Form: Tambah Kategori Baru */}
          {isAddOpen && (
            <form
              onSubmit={handleSaveNew}
              className="mb-6 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-100">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Tambah Kategori Bidang Baru
                </span>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kategori Bidang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Bidang Litbang & Inovasi"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi / Catatan Singkat
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Contoh: Pengelolaan riset, data kajian, dan inovasi daerah"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warna Label
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setNewColor(c.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                          newColor === c.id
                            ? `${c.bgClass} ${c.textClass} border-indigo-400 ring-2 ${c.ringClass} font-semibold shadow-2xs`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.textClass.replace('text-', 'bg-')}`} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs"
                  >
                    Simpan Kategori
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Form: Edit Kategori */}
          {editingCategory && (
            <form
              onSubmit={handleSaveEdit}
              className="mb-6 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-amber-700" />
                  Edit Kategori Bidang: {editingCategory.name}
                </span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kategori Bidang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {editingCategory.name !== editName.trim() && editName.trim() && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      ℹ️ Seluruh berkas dan folder yang saat ini berkategori <strong>"{editingCategory.name}"</strong> akan otomatis disesuaikan menjadi <strong>"{editName.trim()}"</strong>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deskripsi / Catatan Singkat
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warna Label
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditColor(c.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${
                          editColor === c.id
                            ? `${c.bgClass} ${c.textClass} border-amber-500 ring-2 ${c.ringClass} font-semibold shadow-2xs`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.textClass.replace('text-', 'bg-')}`} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-xs"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Form: Confirm Delete */}
          {deletingCategory && (
            <div className="mb-6 p-4 rounded-xl border-2 border-red-300 bg-red-50/50 animate-in fade-in">
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-red-200 text-red-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Konfirmasi Hapus Kategori Bidang</span>
              </div>

              <p className="text-xs text-slate-700 mb-3">
                Apakah Anda yakin ingin menghapus kategori <strong>"{deletingCategory.name}"</strong>?
              </p>

              {getItemCount(deletingCategory.name) > 0 && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-red-200 text-xs">
                  <span className="font-semibold text-red-800 block mb-1">
                    ⚠️ Terdapat {getItemCount(deletingCategory.name)} berkas/folder dalam kategori ini.
                  </span>
                  <label className="block text-slate-600 text-[11px] mb-1.5">
                    Pindahkan seluruh berkas/folder tersebut ke kategori berikut:
                  </label>
                  <select
                    value={reassignCategoryName}
                    onChange={(e) => setReassignCategoryName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {bidangCategories
                      .filter((c) => c.id !== deletingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors shadow-xs"
                >
                  Ya, Hapus Kategori
                </button>
              </div>
            </div>
          )}

          {/* List of Existing Categories */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <span>Kategori &amp; Keterangan</span>
              <span>Jumlah Item &amp; Aksi</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {bidangCategories.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada kategori bidang yang ditambahkan.
                </div>
              ) : (
                bidangCategories.map((cat) => {
                  const count = getItemCount(cat.name);
                  const isEditingThis = editingCategory?.id === cat.id;
                  const isDeletingThis = deletingCategory?.id === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className={`px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                        isEditingThis || isDeletingThis ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Tag className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border border-black/5 ${getColorClass(
                                cat.color
                              )}`}
                            >
                              {cat.name}
                            </span>
                          </div>
                          {cat.description ? (
                            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-sm">
                              {cat.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic mt-0.5">
                              Tanpa deskripsi tambahan
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs flex items-center gap-1 font-mono px-2 py-0.5 rounded-md ${
                            count > 0 ? 'bg-slate-100 text-slate-700 font-semibold' : 'text-slate-400'
                          }`}
                          title={`${count} berkas / folder di Menu Bidang`}
                        >
                          <FolderOpen className="w-3 h-3 text-slate-400" />
                          <span>{count}</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Kategori Bidang"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartDelete(cat)}
                            disabled={bidangCategories.length <= 1}
                            className={`p-1.5 rounded-md transition-colors ${
                              bidangCategories.length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={
                              bidangCategories.length <= 1
                                ? 'Minimal harus tersisa 1 kategori'
                                : 'Hapus Kategori Bidang'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Semua perubahan disimpan otomatis secara permanen.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
