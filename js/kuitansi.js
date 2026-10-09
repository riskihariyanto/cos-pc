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

function buatPDF(pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key];
  const c = S.pengaturan || {};
  const { jsPDF } = window.jspdf;
  const d = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const W = 210, H = 148;

  d.setDrawColor(40);
  d.setLineWidth(0.4);
  d.rect(8, 8, W - 16, H - 16);

  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  d.text((c.namaPC || 'Pengurus Cabang').toUpperCase(), W / 2, 18, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  if (c.alamat) d.text(c.alamat, W / 2, 23, { align: 'center' });
  d.line(12, 27, W - 12, 27);

  d.setFont('helvetica', 'bold');
  d.setFontSize(13);
  d.text('KUITANSI IURAN COS', W / 2, 35, { align: 'center' });
  d.setFont('helvetica', 'normal');
  d.setFontSize(10);
  d.text('No: ' + i.nomorKuitansi, W / 2, 41, { align: 'center' });

  let y = 52;
  const baris = (label, nilai) => {
    d.setFont('helvetica', 'normal');
    d.text(label, 14, y);
    d.text(':', 54, y);
    const t = d.splitTextToSize(nilai, 135);
    d.text(t, 58, y);
    y += Math.max(1, t.length) * 5 + 3;
  };

  baris('Telah terima dari', 'PUK ' + (p.namaPerusahaan || ''));
  baris('Uang sejumlah', terbilangRupiah(i.total));
  baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key) + ' (' + (i.jumlahAnggota || 0) + ' anggota)');
  baris('Tanggal setor', fmtTgl(i.tanggalSetor));
  baris('Status', i.status === 'Lunas' ? 'Lunas (terverifikasi)' : i.status === 'Ditolak' ? 'Ditolak' : 'Menunggu verifikasi');

  gambarQR(d, 'KUITANSI COS|' + i.nomorKuitansi + '|' + (p.namaPerusahaan || '') + '|' + labelPeriode(key) + '|' + i.total + '|' + i.status, 14, 100, 30);

  d.setDrawColor(40);
  d.rect(50, 106, 72, 14);
  d.setFont('helvetica', 'bold');
  d.setFontSize(14);
  d.text(rp(i.total), 86, 115.5, { align: 'center' });

  d.setFont('helvetica', 'normal');
  d.setFontSize(10);
  d.text((c.kota ? c.kota + ', ' : '') + fmtTgl(i.tanggalSetor), 168, 88, { align: 'center' });
  d.text(c.jabatan || 'Bendahara', 168, 93, { align: 'center' });

  if (c.stempel) { try { d.addImage(c.stempel, 'PNG', 132, 92, 28, 28); } catch (e) {} }
  if (c.ttd) { try { d.addImage(c.ttd, 'PNG', 154, 95, 28, 15); } catch (e) {} }

  d.setFont('helvetica', 'bold');
  const nm = c.bendahara || '';
  d.text(nm, 168, 124, { align: 'center' });
  const lebar = Math.max(30, d.getTextWidth(nm));
  d.line(168 - lebar / 2, 125, 168 + lebar / 2, 125);

  return d;
}

function namaFile(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  return 'Kuitansi-' + String(i.nomorKuitansi).replace(/[\/\\]+/g, '-') + '.pdf';
}

function unduhKuitansi(pid, key) {
  try {
    buatPDF(pid, key).save(namaFile(pid, key));
  } catch (e) {
    toast('Gagal membuat PDF: ' + pesan(e));
  }
}

async function kirimWA(pid, key) {
  const i = (S.iuran[pid] || {})[key];
  const p = S.puk[pid] || {};
  const teks = 'Kuitansi iuran COS\nNo: ' + i.nomorKuitansi + '\nPUK: ' + p.namaPerusahaan + '\nPeriode: ' + labelPeriode(key) + '\nNominal: ' + rp(i.total) + '\nStatus: ' + i.status;
  try {
    const doc = buatPDF(pid, key);
    const nama = namaFile(pid, key);
    const file = new File([doc.output('blob')], nama, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: teks });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    doc.save(nama);
    window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank');
  } catch (e) {
    toast('Gagal menyiapkan kuitansi: ' + pesan(e));
  }
}
