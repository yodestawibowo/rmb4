import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { SuratItem, KategoriSuratKeluar, KATEGORI_SURAT_KELUAR_LIST } from '../../types';
import { formatDateIndo } from '../../services/storageService';
import { BapperidaLogo } from '../common/BapperidaLogo';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Filter, 
  Calendar, 
  FileSpreadsheet,
  Table as TableIcon,
  UserCheck,
  Settings,
  PenLine,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface RekapTtdConfig {
  mengetahuiJabatan: string;
  mengetahuiInstansi: string;
  mengetahuiNama: string;
  mengetahuiNip: string;
  pengelolaNama: string;
  pengelolaNip: string;
  kotaTtd: string;
}

const STORAGE_KEY_REKAP_TTD = 'arsipcloud_rekap_ttd_config_v2';

const DEFAULT_TTD: RekapTtdConfig = {
  mengetahuiJabatan: 'KEPALA BIDANG PMPEPD',
  mengetahuiInstansi: 'Badan Perencanaan Pembangunan, Riset, dan Inovasi Daerah',
  mengetahuiNama: '',
  mengetahuiNip: '',
  pengelolaNama: '',
  pengelolaNip: '',
  kotaTtd: 'Kota Agung',
};

interface SuratRekapModalProps {
  isOpen: boolean;
  onClose: () => void;
  suratList: SuratItem[];
  defaultTipe?: 'all' | 'masuk' | 'keluar';
}

export const SuratRekapModal: React.FC<SuratRekapModalProps> = ({
  isOpen,
  onClose,
  suratList,
  defaultTipe = 'all',
}) => {
  const { currentUser } = useAuth();
  const [tipeFilter, setTipeFilter] = useState<'all' | 'masuk' | 'keluar'>(defaultTipe);
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copied, setCopied] = useState(false);
  const [isTtdSettingsOpen, setIsTtdSettingsOpen] = useState(false);

  // Settings for signatures (Mengetahui & Pengelola Arsip)
  const [ttdConfig, setTtdConfig] = useState<RekapTtdConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REKAP_TTD);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_TTD, ...parsed };
      }
    } catch {}
    return DEFAULT_TTD;
  });

  // Save changes to localStorage
  const updateTtdConfig = (updates: Partial<RekapTtdConfig>) => {
    setTtdConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_REKAP_TTD, JSON.stringify(next));
      } catch (e) {
        console.warn('Gagal menyimpan konfigurasi TTD:', e);
      }
      return next;
    });
  };

  const handleResetTtdConfig = () => {
    setTtdConfig(DEFAULT_TTD);
    try {
      localStorage.removeItem(STORAGE_KEY_REKAP_TTD);
    } catch {}
  };

  // Nama pengelola arsip: otomatis dari nama akun pengguna yang sedang login jika belum diisi custom
  const finalPengelolaNama = ttdConfig.pengelolaNama.trim() || currentUser?.name || 'Administrator Sistem';

  // Sync defaultTipe when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTipeFilter(defaultTipe);
    }
  }, [isOpen, defaultTipe]);

  // Filter letters for rekap
  const filteredData = useMemo(() => {
    return suratList.filter((item) => {
      // 1. Tipe
      if (tipeFilter === 'masuk') {
        if (item.tipe !== 'masuk' && item.jenis === 'Surat Keluar') return false;
      } else if (tipeFilter === 'keluar') {
        if (item.tipe !== 'keluar' && item.jenis !== 'Surat Keluar') return false;
      }

      // 2. Kategori / Klasifikasi
      if (kategoriFilter !== 'all') {
        const matchesJenis = item.jenis === kategoriFilter;
        const matchesKatKeluar = item.kategoriKeluar === kategoriFilter;
        if (!matchesJenis && !matchesKatKeluar) return false;
      }

      // 3. Date range
      if (startDate && item.tanggalSurat < startDate) return false;
      if (endDate && item.tanggalSurat > endDate) return false;

      return true;
    });
  }, [suratList, tipeFilter, kategoriFilter, startDate, endDate]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = [
      'No',
      'Nomor Surat',
      'Tanggal Surat',
      'Jenis / Klasifikasi',
      'Pengirim & Penerima',
      'Perihal & Ringkasan',
    ];

    const rows = filteredData.map((s, idx) => {
      const klasifikasi = s.kategoriKeluar ? `Surat Keluar - ${s.kategoriKeluar}` : s.jenis;
      const pengirimPenerima = `Pengirim: ${s.pengirim} | Penerima: ${s.penerima}`;
      const perihalRingkasan = s.ringkasan ? `${s.perihal} (Ringkasan: ${s.ringkasan})` : s.perihal;

      return [
        idx + 1,
        s.nomorSurat,
        s.tanggalSurat,
        klasifikasi,
        pengirimPenerima,
        perihalRingkasan,
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Format proper column widths in Excel
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 15 },
      { wch: 32 },
      { wch: 42 },
      { wch: 55 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Tabel Surat');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Rekap_Tabel_Surat_Bapperida_${dateStr}.xlsx`);
  };

  const handleCopyTable = () => {
    const tableElement = document.getElementById('table-rekap-surat');
    if (!tableElement) return;

    try {
      const html = tableElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([tableElement.innerText], { type: 'text/plain' });

      const item = new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      });

      navigator.clipboard.write([item]).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      // Fallback plain text copy
      navigator.clipboard.writeText(tableElement.innerText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      {/* Print-specific style to isolate the rekap table when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-rekap-container, #printable-rekap-container * {
            visibility: visible;
          }
          #printable-rekap-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          table.bordered-print-table, 
          table.bordered-print-table th, 
          table.bordered-print-table td {
            border: 1.5px solid #000000 !important;
            border-collapse: collapse !important;
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tool Rekapitulasi Data Surat
              </h2>
              <p className="text-[11px] text-slate-500">
                Format tabel bergaris resmi (border) siap cetak dan ekspor ke Word / Excel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTtdSettingsOpen(!isTtdSettingsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer ${
                isTtdSettingsOpen
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
              title="Atur Nama & NIP Pejabat Mengetahui serta Pengelola Arsip"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Atur Tanda Tangan</span>
            </button>

            <button
              onClick={handleCopyTable}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Salin tabel ke clipboard untuk ditempel di Microsoft Word / Excel"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Tabel</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Unduh rekap tabel rapi dalam format Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Cetak lembar rekapitulasi surat"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls (No Print) */}
        <div className="px-5 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-600 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" /> Filter Rekap:
            </span>

            {/* Scope / Tipe */}
            <select
              value={tipeFilter}
              onChange={(e) => setTipeFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Semua Naskah Dinas</option>
              <option value="masuk">Khusus Surat Masuk</option>
              <option value="keluar">Khusus Surat Keluar</option>
            </select>

            {/* Kategori / Klasifikasi */}
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
            >
              <option value="all">Semua Kategori / Klasifikasi</option>
              <optgroup label="Surat Masuk & Umum">
                <option value="Surat Masuk">Surat Masuk</option>
                <option value="Surat Keputusan (SK)">Surat Keputusan (SK)</option>
                <option value="Surat Tugas">Surat Tugas</option>
                <option value="Nota Dinas">Nota Dinas</option>
                <option value="Undangan Resmi">Undangan Resmi</option>
                <option value="Surat Edaran">Surat Edaran</option>
              </optgroup>
              <optgroup label="10 Kategori Surat Keluar">
                {KATEGORI_SURAT_KELUAR_LIST.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[11px] bg-transparent text-slate-700 focus:outline-none"
                title="Dari Tanggal"
              />
              <span className="text-slate-400 text-[10px]">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[11px] bg-transparent text-slate-700 focus:outline-none"
                title="Sampai Tanggal"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="text-slate-400 hover:text-slate-700 text-[10px] ml-1"
                  title="Reset Tanggal"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Total tercatat: <strong className="text-slate-800">{filteredData.length}</strong> surat
          </div>
        </div>

        {/* Settings Panel for Mengetahui & Pengelola Arsip (No Print) */}
        {isTtdSettingsOpen && (
          <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-200 animate-in fade-in no-print">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/80">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Pengaturan Pejabat Penandatangan Lembar Rekapitulasi
                </h3>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  Tersimpan Otomatis
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetTtdConfig}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                  title="Kembalikan ke format baku sistem"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Reset Default</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTtdSettingsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Bagian Mengetahui (Kepala Bidang PMPEPD) */}
              <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 text-indigo-900 font-bold text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Bagian Mengetahui (Pimpinan)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jabatan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.mengetahuiJabatan}
                    onChange={(e) => updateTtdConfig({ mengetahuiJabatan: e.target.value })}
                    placeholder="Contoh: KEPALA BIDANG PMPEPD"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Unit Kerja / Badan Instansi
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.mengetahuiInstansi}
                    onChange={(e) => updateTtdConfig({ mengetahuiInstansi: e.target.value })}
                    placeholder="Badan Perencanaan Pembangunan, Riset, dan Inovasi Daerah"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Pejabat Mengetahui <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.mengetahuiNama}
                    onChange={(e) => updateTtdConfig({ mengetahuiNama: e.target.value })}
                    placeholder="Contoh: Ir. H. Nama Pejabat, M.Si"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NIP Pejabat Mengetahui <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.mengetahuiNip}
                    onChange={(e) => updateTtdConfig({ mengetahuiNip: e.target.value })}
                    placeholder="Contoh: 19800512 200501 1 005"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Bagian Pengelola Arsip Persuratan */}
              <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 text-emerald-900 font-bold text-xs">
                  <PenLine className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Bagian Pengelola Arsip Persuratan</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Nama Pengelola Arsip
                    </label>
                    {currentUser?.name && (
                      <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.2 rounded">
                        Otomatis dari Akun Aktif
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ttdConfig.pengelolaNama}
                    onChange={(e) => updateTtdConfig({ pengelolaNama: e.target.value })}
                    placeholder={currentUser?.name || 'Ahmad Fauzi, S.Kom'}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    *Kosongkan untuk otomatis menggunakan nama akun login: <strong>{currentUser?.name || 'User'}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NIP / Keterangan Jabatan Pengelola (Opsional)
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.pengelolaNip}
                    onChange={(e) => updateTtdConfig({ pengelolaNip: e.target.value })}
                    placeholder="Contoh: 19900815 201402 1 002 (atau kosongkan untuk 'Pengadministrasi Persuratan')"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kota Penandatanganan
                  </label>
                  <input
                    type="text"
                    value={ttdConfig.kotaTtd}
                    onChange={(e) => updateTtdConfig({ kotaTtd: e.target.value })}
                    placeholder="Kota Agung"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Container with Printable Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div
            id="printable-rekap-container"
            className="bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 max-w-4xl mx-auto"
          >
            {/* Kop Resmi Instansi */}
            <div className="border-b-2 border-slate-900 pb-3 mb-5 flex items-center gap-4">
              <BapperidaLogo size="md" className="w-16 h-16 shrink-0" />
              <div className="flex-1 text-center pr-10">
                <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 leading-tight">
                  Pemerintah Kabupaten Tanggamus
                </h1>
                <h2 className="text-xs font-extrabold uppercase tracking-tight text-slate-800 leading-tight mt-0.5">
                  Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah (BAPPERIDA)
                </h2>
                <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  Bidang Perencanaan Makro Pengendalian dan Evaluasi Pembangunan Daerah
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Kompleks Perkantoran Pemkab Tanggamus · Sistem Kearsipan E-PMPED
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 underline decoration-1 underline-offset-4">
                REKAPITULASI BUKU AGENDA ARSIP PERSURATAN
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {tipeFilter === 'masuk'
                  ? 'Buku Agenda Khusus Surat Masuk'
                  : tipeFilter === 'keluar'
                    ? 'Buku Agenda Khusus Surat Keluar'
                    : 'Buku Agenda Terpadu Surat Masuk & Surat Keluar'}
                {startDate && endDate && ` · Periode: ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`}
              </p>
            </div>

            {/* THE BORDERED REKAP TABLE EXACTLY AS REQUESTED */}
            {filteredData.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs">
                Tidak ada data surat yang memenuhi kriteria filter saat ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  id="table-rekap-surat"
                  className="w-full text-left text-xs border-collapse border-2 border-slate-800 bordered-print-table"
                  style={{ border: '2px solid #1e293b' }}
                >
                  <thead className="bg-slate-100 text-slate-900">
                    <tr>
                      <th
                        className="py-2.5 px-3 font-bold text-center border border-slate-700 w-12"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        No
                      </th>
                      <th
                        className="py-2.5 px-3 font-bold border border-slate-700 min-w-[150px]"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        Nomor Surat
                      </th>
                      <th
                        className="py-2.5 px-3 font-bold border border-slate-700 min-w-[110px]"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        Tanggal Surat
                      </th>
                      <th
                        className="py-2.5 px-3 font-bold border border-slate-700 min-w-[160px]"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        Jenis / Klasifikasi
                      </th>
                      <th
                        className="py-2.5 px-3 font-bold border border-slate-700 min-w-[180px]"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        Pengirim &amp; Penerima
                      </th>
                      <th
                        className="py-2.5 px-3 font-bold border border-slate-700 min-w-[220px]"
                        style={{ border: '1.5px solid #334155' }}
                      >
                        Perihal &amp; Ringkasan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredData.map((item, index) => {
                      const klasifikasi = item.kategoriKeluar
                        ? `Surat Keluar: ${item.kategoriKeluar}`
                        : item.jenis;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* 1. No */}
                          <td
                            className="py-2.5 px-3 text-center font-mono font-medium border border-slate-600 align-top"
                            style={{ border: '1px solid #475569' }}
                          >
                            {index + 1}
                          </td>

                          {/* 2. Nomor Surat */}
                          <td
                            className="py-2.5 px-3 font-mono font-bold text-slate-900 border border-slate-600 align-top break-all"
                            style={{ border: '1px solid #475569' }}
                          >
                            <div>{item.nomorSurat}</div>
                            {item.status && (
                              <span className="inline-block mt-1 text-[9px] uppercase px-1.5 py-0.2 rounded border border-slate-400 bg-slate-100 font-sans font-medium">
                                Status: {item.status}
                              </span>
                            )}
                          </td>

                          {/* 3. Tanggal Surat */}
                          <td
                            className="py-2.5 px-3 border border-slate-600 align-top text-slate-800 whitespace-nowrap"
                            style={{ border: '1px solid #475569' }}
                          >
                            <div className="font-medium">{formatDateIndo(item.tanggalSurat)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Terima/Arsip: {formatDateIndo(item.tanggalDiterima)}
                            </div>
                          </td>

                          {/* 4. Jenis / Klasifikasi */}
                          <td
                            className="py-2.5 px-3 border border-slate-600 align-top text-slate-800"
                            style={{ border: '1px solid #475569' }}
                          >
                            <div className="font-semibold text-slate-900">{klasifikasi}</div>
                            {item.tingkatUrgensi && (
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                Urgensi: <strong className="text-slate-800">{item.tingkatUrgensi}</strong>
                              </div>
                            )}
                          </td>

                          {/* 5. Pengirim & Penerima */}
                          <td
                            className="py-2.5 px-3 border border-slate-600 align-top"
                            style={{ border: '1px solid #475569' }}
                          >
                            <div className="font-semibold text-slate-900">
                              <span className="text-slate-500 font-normal text-[10px] block">Pengirim:</span>
                              {item.pengirim}
                            </div>
                            <div className="mt-1.5 text-slate-800">
                              <span className="text-slate-500 font-normal text-[10px] block">Penerima / Tujuan:</span>
                              {item.penerima}
                            </div>
                          </td>

                          {/* 6. Perihal & Ringkasan */}
                          <td
                            className="py-2.5 px-3 border border-slate-600 align-top"
                            style={{ border: '1px solid #475569' }}
                          >
                            <div className="font-semibold text-slate-900 leading-snug">
                              {item.perihal}
                            </div>
                            {item.ringkasan && (
                              <div className="text-[11px] text-slate-600 mt-1 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-200">
                                <span className="font-medium text-slate-700">Ringkasan:</span> {item.ringkasan}
                              </div>
                            )}
                            {item.disposisiKepada && (
                              <div className="text-[10px] text-indigo-700 mt-1">
                                Disposisi: <em>{item.disposisiKepada}</em>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Signature Section */}
            <div className="mt-8 pt-4 flex justify-between items-start text-xs text-slate-700 break-inside-avoid">
              <div className="text-center w-56">
                <p className="text-[11px] text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">Kepala BAPPERIDA</p>
                <p className="text-[10px] text-slate-600">Kabupaten Tanggamus</p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-900">( ........................................ )</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. .................................</p>
              </div>

              <div className="text-center w-56">
                <p className="text-[11px] text-slate-500">Kota Agung, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
                <p className="font-bold text-slate-900 mt-0.5">Pengelola Arsip Persuratan</p>
                <p className="text-[10px] text-slate-600">Bidang PME BAPPERIDA</p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-900">( ........................................ )</p>
                <p className="text-[10px] text-slate-500 font-mono">Pengadministrasi Persuratan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 no-print">
          <span>
            Format tabel telah disesuaikan dengan instruksi tata naskah dinas resmi dan bergaris (border).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
