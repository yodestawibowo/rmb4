import React, { useState, useEffect } from 'react';
import { StorageScope, User } from '../../types';
import { FolderPlus, X, Tag } from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: StorageScope;
  targetOwner?: User;
  onCreate: (name: string, bidangCategory?: string) => void;
  onOpenManageCategories?: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  scope,
  targetOwner,
  onCreate,
  onOpenManageCategories,
}) => {
  const { bidangCategories } = useStorage();
  const [folderName, setFolderName] = useState('');
  const [bidangCategory, setBidangCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (bidangCategories.length > 0 && (!bidangCategory || !bidangCategories.some(c => c.name === bidangCategory))) {
      setBidangCategory(bidangCategories[0].name);
    }
  }, [bidangCategories, bidangCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Nama folder tidak boleh kosong.');
      return;
    }
    onCreate(folderName.trim(), scope === 'bidang' ? (bidangCategory || bidangCategories[0]?.name) : undefined);
    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>Tambah Folder Baru</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Folder
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="contoh: Dokumen Laporan Triwulan I"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {scope === 'bidang' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kategori Bidang
                </label>
                {onOpenManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManageCategories();
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Kelola / Tambah Kategori</span>
                  </button>
                )}
              </div>
              <select
                value={bidangCategory}
                onChange={(e) => setBidangCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {bidangCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.description ? `(${c.description})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="text-[11px] text-slate-500 mb-5 bg-slate-50 p-2.5 rounded-lg">
            Ruang Penyimpanan: <strong className="text-slate-700 capitalize">{scope === 'bidang' ? 'Menu Bidang' : scope === 'public' ? 'Data Bidang PMPEPD' : 'File Saya Pribadi'}</strong>
            {targetOwner && <span className="block mt-0.5 text-indigo-700">Pemilik Folder: {targetOwner.name}</span>}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              Buat Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
