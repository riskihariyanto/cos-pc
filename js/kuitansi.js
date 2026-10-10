function gambarQR(d, teks, x, y, size) {
  const q = qrcode(0, 'M');
  q.addData(teks);
  q.make();
  const n = q.getModuleCount();
  const m = size / n;
  d.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d.rect(x + c * m, y + r * m, m + 0.02, m + 0.02, 'F');
    }
  }
}

function taruhGambar(d, src, x, y, maxW, maxH, rata) {
  try {
    const pr = d.getImageProperties(src);
    const k = Math.min(maxW / pr.width, maxH / pr.height);
    const w = pr.width * k;
    const h = pr.height * k;
    const px = rata === 'kanan' ? x + maxW - w : x + (maxW - w) / 2;
    d.addImage(src, pr.fileType || 'PNG', px, y + (maxH - h), w, h);
  } catch (e) {}
}

function buatPDF(pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key];
  const c = S.pengaturan || {};
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = 210, H = 148;
  const tengah = W / 2;

  d.setDrawColor(40, 40, 40);
  d.setLineWidth(0.5);
  d.rect(8, 8, W - 16, H - 16);
  d.setLineWidth(0.15);
  d.rect(9.5, 9.5, W - 19, H - 19);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(17);
  d.text((c.namaPC || 'Pengurus Cabang').toUpperCase(), tengah, 21, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(8);
  d.setTextColor(85, 85, 85);
  if (c.alamat) d.text(c.alamat, tengah, 26, { align: 'center' });
  d.setDrawColor(0, 85, 165);
  d.setLineWidth(0.9);
  d.line(14, 30, W - 14, 30);
  d.setDrawColor(253, 185, 19);
  d.setLineWidth(0.3);
  d.line(14, 31.4, W - 14, 31.4);

  d.setTextColor(26, 26, 26);
  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('KUITANSI IURAN COS PC', tengah, 39, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.setTextColor(85, 85, 85);
  d.text('No: ' + i.nomorKuitansi, tengah, 44.5, { align: 'center' });

  const xLabel = 16, xTitik = 55, xNilai = 59;
  let y = 54;
  const baris = (label, nilai) => {
    d.setFontSize(10);
    d.setFont('helvetica', 'normal');
    d.setTextColor(85, 85, 85);
    d.text(label, xLabel, y);
    d.text(':', xTitik, y);
    d.setFont('helvetica', 'bold');
    d.setTextColor(26, 26, 26);
    const t = d.splitTextToSize(nilai, W - 16 - xNilai);
    d.text(t, xNilai, y);
    y += Math.max(1, t.length) * 4.6 + 3.2;
  };

  baris('Telah terima dari', 'PUK ' + (p.namaPerusahaan || ''));
  baris('Uang sejumlah', terbilangRupiah(i.total));
  baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key));
  baris('Tanggal setor', fmtTgl(i.tanggalSetor));
  baris('Status', teksStatus(i));

  gambarQR(d, 'KUITANSI COS|' + i.nomorKuitansi + '|' + (p.namaPerusahaan || '') + '|' + labelPeriode(key) + '|' + i.total + '|' + i.status, 16, 92, 28);
  d.setFont('helvetica', 'normal');
  d.setFontSize(6.5);
  d.setTextColor(85, 85, 85);
  d.text('Pindai untuk memeriksa data', 30, 123, { align: 'center' });

  d.setFillColor(248, 249, 250);
  d.setDrawColor(190, 196, 204);
  d.setLineWidth(0.25);
  d.roundedRect(52, 96, 66, 16, 1.8, 1.8, 'FD');
  d.setFontSize(7);
  d.setTextColor(85, 85, 85);
  d.text('JUMLAH DITERIMA', 85, 100.6, { align: 'center' });
  d.setFont('helvetica', 'bold');
  d.setFontSiz
