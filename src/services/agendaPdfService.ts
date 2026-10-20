import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AgendaItemRecord {
  id: string;
  userId: string;
  creatorName?: string;
  title: string;
  location: string;
  description?: string;
  scheduleDate: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd?: string; // HH:mm
  groupJid?: string;
  createdAt: string;
}

export function getWIBDate(offsetDays: number = 0): string {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
  const wibString = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const wibDate = new Date(wibString);
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatIndonesianDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function getFormattedWIBTimestamp(): string {
  try {
    const now = new Date();
    const wibString = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return wibString.replace(/\./g, ':');
  } catch {
    return new Date().toLocaleDateString('id-ID');
  }
}

export async function generateAgendaPDF(dateStr: string, agendas: AgendaItemRecord[]): Promise<Buffer> {
  const sortedAgendas = [...agendas].sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''));
  const formattedDate = formatIndonesianDate(dateStr);
  const printTimestamp = getFormattedWIBTimestamp();

  // Generate QR verification buffer
  const qrVerificationPayload = [
    `DOKUMEN RESMI AGENDA BIDANG PMPEPD`,
    `BAPPERIDA KABUPATEN TANGGAMUS`,
    `Tanggal: ${formattedDate} (${dateStr})`,
    `Total Kegiatan: ${sortedAgendas.length} Agenda`,
    `Dicetak pada: ${printTimestamp} WIB`,
    `Verifikasi Sistem: E-PMPED Cloud v1.0`,
  ].join('\n');

  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(qrVerificationPayload, {
      margin: 1,
      width: 120,
      color: {
        dark: '#0f2b82',
        light: '#ffffff',
      },
    });
  } catch (e) {
    console.warn('[AgendaPDF] Gagal membuat buffer QRCode:', e);
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 38, right: 38 },
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: Error) => reject(err));

      const startX = 38;
      const pageWidth = 519; // 595.28 - (38 * 2)

      // =====================================================================
      // 1. KOP SURAT RESMI (DENGAN LOGO DAERAH & GARIS GANDA KEDINASAN)
      // =====================================================================
      const logoCandidates = [
        path.resolve(process.cwd(), 'public/logo.jpg'),
        path.resolve(__dirname, '../../public/logo.jpg'),
      ];
      let logoPath: string | null = null;
      for (const p of logoCandidates) {
        if (fs.existsSync(p)) {
          logoPath = p;
          break;
        }
      }

      if (logoPath) {
        try {
          doc.image(logoPath, startX + 8, 36, { width: 50, height: 50 });
        } catch (imgErr) {
          console.warn('[AgendaPDF] Gagal me-load logo:', imgErr);
        }
      }

      // Judul Kop Sesuai Format Template Resmi (Centered)
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f2b82')
        .text('AGENDA BIDANG PMPEPD', startX, 36, { width: pageWidth, align: 'center' });

      doc.fontSize(12.5).font('Helvetica-Bold').fillColor('#1e293b')
        .text('BAPPERIDA TANGGAMUS', startX, 53, { width: pageWidth, align: 'center' });

      doc.fontSize(9.5).font('Helvetica').fillColor('#475569')
        .text(`Hari / Tanggal: ${formattedDate}`, startX, 70, { width: pageWidth, align: 'center' });

      // Garis Ganda Pemisah Kop Kedinasan
      const lineY = 94;
      doc.lineWidth(2.2).strokeColor('#0f2b82').moveTo(startX, lineY).lineTo(startX + pageWidth, lineY).stroke();
      doc.lineWidth(0.75).strokeColor('#94a3b8').moveTo(startX, lineY + 3.2).lineTo(startX + pageWidth, lineY + 3.2).stroke();

      // =====================================================================
      // 2. TABEL AGENDA KEGIATAN (DESAIN MODERN & MENARIK)
      // =====================================================================
      const colWidths = {
        waktu: 85,
        kegiatan: 175,
        lokasi: 125,
        ket: 134,
      };

      const tableHeaderY = 108;
      const headerHeight = 26;

      // Header Bar Background (Deep Royal Navy dengan aksen elegan)
      doc.rect(startX, tableHeaderY, pageWidth, headerHeight).fill('#1e3a8a');
      doc.rect(startX, tableHeaderY, pageWidth, headerHeight).lineWidth(0.8).strokeColor('#172554').stroke();

      // Header Labels (Putih Bersih Bold)
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');

      let hX = startX;
      doc.text('WAKTU', hX, tableHeaderY + 8, { width: colWidths.waktu, align: 'center' });
      doc.lineWidth(0.6).strokeColor('#3b82f6').moveTo(hX + colWidths.waktu, tableHeaderY).lineTo(hX + colWidths.waktu, tableHeaderY + headerHeight).stroke();

      hX += colWidths.waktu;
      doc.text('KEGIATAN', hX + 8, tableHeaderY + 8, { width: colWidths.kegiatan - 16 });
      doc.lineWidth(0.6).strokeColor('#3b82f6').moveTo(hX + colWidths.kegiatan, tableHeaderY).lineTo(hX + colWidths.kegiatan, tableHeaderY + headerHeight).stroke();

      hX += colWidths.kegiatan;
      doc.text('LOKASI', hX + 8, tableHeaderY + 8, { width: colWidths.lokasi - 16 });
      doc.lineWidth(0.6).strokeColor('#3b82f6').moveTo(hX + colWidths.lokasi, tableHeaderY).lineTo(hX + colWidths.lokasi, tableHeaderY + headerHeight).stroke();

      hX += colWidths.lokasi;
      doc.text('KETERANGAN', hX + 8, tableHeaderY + 8, { width: colWidths.ket - 16 });

      let currentY = tableHeaderY + headerHeight;

      if (sortedAgendas.length === 0) {
        // EMPTY STATE ELEGAN & MENARIK
        const emptyHeight = 52;
        doc.rect(startX, currentY, pageWidth, emptyHeight).fill('#f8fafc');
        doc.rect(startX, currentY, pageWidth, emptyHeight).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#475569')
          .text('Tidak ada agenda kegiatan kedinasan yang terdaftar pada tanggal ini.', startX + 16, currentY + 14, {
            width: pageWidth - 32,
            align: 'center',
          });

        doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
          .text('Aktivitas harian dan koordinasi kerja bidang berjalan sesuai ketentuan operasional normal.', startX + 16, currentY + 30, {
            width: pageWidth - 32,
            align: 'center',
          });

        currentY += emptyHeight;
      } else {
        // RENDER BARIS TABEL AGENDA
        sortedAgendas.forEach((item, index) => {
          const waktuText = item.timeEnd ? `${item.timeStart} - ${item.timeEnd}` : `${item.timeStart} WIB`;
          const kegiatanText = item.title || '-';
          const lokasiText = item.location || '-';
          const ketText = item.description || '-';
          const creatorSubtext = item.creatorName ? `Staf / PIC: ${item.creatorName}` : '';

          doc.font('Helvetica').fontSize(8.5);
          const hKegTitle = doc.heightOfString(kegiatanText, { width: colWidths.kegiatan - 16 });
          const hKegSub = creatorSubtext ? doc.heightOfString(creatorSubtext, { width: colWidths.kegiatan - 16 }) + 4 : 0;
          const hKeg = hKegTitle + hKegSub;
          const hLok = doc.heightOfString(lokasiText, { width: colWidths.lokasi - 22 });
          const hKet = doc.heightOfString(ketText, { width: colWidths.ket - 16 });

          const rowHeight = Math.max(34, hKeg + 16, hLok + 16, hKet + 16);

          // Cek Halaman Baru (Page break)
          if (currentY + rowHeight > doc.page.height - 110) {
            doc.addPage();
            currentY = 40;
          }

          // Alternating Row Background
          const rowBgColor = index % 2 === 1 ? '#f8fafc' : '#ffffff';
          doc.rect(startX, currentY, pageWidth, rowHeight).fill(rowBgColor);

          // Border Kotak Baris
          doc.rect(startX, currentY, pageWidth, rowHeight).lineWidth(0.6).strokeColor('#cbd5e1').stroke();

          // Garis Vertikal Antar Kolom
          let divX = startX + colWidths.waktu;
          doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(divX, currentY).lineTo(divX, currentY + rowHeight).stroke();
          divX += colWidths.kegiatan;
          doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(divX, currentY).lineTo(divX, currentY + rowHeight).stroke();
          divX += colWidths.lokasi;
          doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(divX, currentY).lineTo(divX, currentY + rowHeight).stroke();

          // 1. Kolom WAKTU: Badge Pill Biru Elegan
          let rX = startX;
          const pillWidth = colWidths.waktu - 14;
          const pillHeight = 18;
          const pillY = currentY + (rowHeight - pillHeight) / 2;

          doc.roundedRect(rX + 7, pillY, pillWidth, pillHeight, 4).fill('#eff6ff');
          doc.roundedRect(rX + 7, pillY, pillWidth, pillHeight, 4).lineWidth(0.6).strokeColor('#bfdbfe').stroke();

          doc.fillColor('#1d4ed8').font('Helvetica-Bold').fontSize(8)
            .text(waktuText, rX + 7, pillY + 4.5, { width: pillWidth, align: 'center' });

          // 2. Kolom KEGIATAN: Judul Bold + Subtext Pembuat
          rX += colWidths.waktu;
          doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
            .text(kegiatanText, rX + 8, currentY + 8, { width: colWidths.kegiatan - 16 });

          if (creatorSubtext) {
            doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
              .text(creatorSubtext, rX + 8, currentY + 8 + hKegTitle + 2, { width: colWidths.kegiatan - 16 });
          }

          // 3. Kolom LOKASI: Indikator Pin / Dot + Nama Tempat
          rX += colWidths.kegiatan;
          doc.circle(rX + 11, currentY + 12, 2.5).fill('#3b82f6');
          doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5)
            .text(lokasiText, rX + 18, currentY + 8, { width: colWidths.lokasi - 26 });

          // 4. Kolom KETERANGAN
          rX += colWidths.lokasi;
          doc.fillColor('#334155').font('Helvetica').fontSize(8.5)
            .text(ketText, rX + 8, currentY + 8, { width: colWidths.ket - 16 });

          currentY += rowHeight;
        });
      }

      // =====================================================================
      // 3. BLOK VERIFIKASI RESMI DIGITAL & REKAPITULASI (FOOTER SECTION)
      // =====================================================================
      currentY += 16;

      // Jika ruang halaman tidak cukup untuk footer verifikasi, pindah ke halaman baru
      if (currentY + 75 > doc.page.height - 40) {
        doc.addPage();
        currentY = 40;
      }

      // Kotak Ringkasan & Stempel Digital Resmi
      const stampBoxY = currentY;
      const stampBoxHeight = 56;

      doc.roundedRect(startX, stampBoxY, pageWidth, stampBoxHeight, 6).fill('#f8fafc');
      doc.roundedRect(startX, stampBoxY, pageWidth, stampBoxHeight, 6).lineWidth(0.8).strokeColor('#cbd5e1').stroke();

      // Sisi Kiri: Status & Identitas Bidang
      doc.roundedRect(startX + 12, stampBoxY + 10, 165, 16, 3).fill('#ecfdf5');
      doc.roundedRect(startX + 12, stampBoxY + 10, 165, 16, 3).lineWidth(0.6).strokeColor('#a7f3d0').stroke();

      doc.fillColor('#047857').font('Helvetica-Bold').fontSize(7.5)
        .text('✓ DOKUMEN AGENDA RESMI', startX + 18, stampBoxY + 14);

      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9)
        .text(`Total Agenda: ${sortedAgendas.length} Kegiatan Kedinasan`, startX + 12, stampBoxY + 31);

      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5)
        .text('Pengendalian, Monitoring & Evaluasi Pembangunan Daerah', startX + 12, stampBoxY + 42);

      // Sisi Kanan: QR Code Digital Verification & Stempel
      const qrAreaX = startX + pageWidth - 145;
      if (qrBuffer) {
        doc.image(qrBuffer, qrAreaX, stampBoxY + 5, { width: 46, height: 46 });
      }

      const qrTextX = qrAreaX + 50;
      doc.fillColor('#0f2b82').font('Helvetica-Bold').fontSize(7.5)
        .text('VERIFIKASI RESMI', qrTextX, stampBoxY + 12);
      doc.fillColor('#334155').font('Helvetica').fontSize(7)
        .text('E-PMPED Cloud', qrTextX, stampBoxY + 22);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7)
        .text('Bapperida Tanggamus', qrTextX, stampBoxY + 31);
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(6.5)
        .text('ASLI & VALID', qrTextX, stampBoxY + 41);

      // =====================================================================
      // 4. CATATAN KAKI DOKUMEN RESMI (FOOTER)
      // =====================================================================
      const footerY = stampBoxY + stampBoxHeight + 12;

      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(startX, footerY).lineTo(startX + pageWidth, footerY).stroke();

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(
          `Dokumen resmi dicetak secara otomatis melalui Sistem E-PMPED Bapperida Tanggamus pada ${printTimestamp} WIB.`,
          startX,
          footerY + 5,
          { width: pageWidth, align: 'right' }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
