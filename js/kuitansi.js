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
  d.text('KUITANSI IURAN COS', tengah, 39, { align: 'center' });
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
  baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key) + ' (' + (i.jumlahAnggota || 0) + ' anggota)');
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
  d.setFontSize(15);
  d.setTextColor(26, 26, 26);
  d.text(rp(i.total), 85, 108.6, { align: 'center' });

  const cx = 164;
  d.setFont('helvetica', 'normal');
  d.setFontSize(9.5);
  d.text((c.kota ? c.kota + ', ' : '') + fmtTgl(i.tanggalSetor), cx, 87, { align: 'center' });
  d.text(c.jabatan || 'Bendahara', cx, 92, { align: 'center' });

  if (c.stempel) {
    try {
      d.saveGraphicsState();
      d.setGState(new d.GState({ opacity: 0.88 }));
      taruhGambar(d, c.stempel, 124, 89, 29, 29);
      d.restoreGraphicsState();
    } catch (e) {
      taruhGambar(d, c.stempel, 124, 89, 29, 29);
    }
  }
  if (c.ttd) taruhGambar(d, c.ttd, cx - 17, 92.5, 32, 17.5);

  d.setFont('helvetica', 'bold');
  d.setFontSize(10.5);
  d.setTextColor(26, 26, 26);
  const nm = c.bendahara || '';
  d.text(nm, cx, 113, { align: 'center' });
  const lebar = Math.max(34, d.getTextWidth(nm) + 6);
  d.setDrawColor(26, 26, 26);
  d.setLineWidth(0.35);
  d.line(cx - lebar / 2, 114.3, cx + lebar / 2, 114.3);

  d.setFont('helvetica', 'normal');
  d.setFontSize(6.5);
  d.setTextColor(120, 120, 120);
  d.text('Kuitansi ini diterbitkan melalui sistem Iuran COS.', tengah, 133, { align: 'center' });

  return d;
}

function teksStatus(i) {
  return i.status === 'Lunas' ? 'Lunas (terverifikasi)' : i.status === 'Ditolak' ? 'Ditolak' : 'Menunggu verifikasi';
}

function dataQR(teks) {
  try {
    const q = qrcode(0, 'M');
    q.addData(teks);
    q.make();
    return q.createDataURL(4, 0);
  } catch (e) {
    return '';
  }
}

const GAYA_PREVIEW = `
.kp-overlay{position:fixed;inset:0;z-index:40;background:rgba(15,23,21,.72);display:flex;align-items:center;justify-content:center;padding:10px}
.kp-box{background:#fff;border-radius:14px;width:100%;max-width:880px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.kp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;background:var(--pri,#0055a5);color:#fff}
.kp-head h2{margin:0;font-size:20px}
.kp-x{background:rgba(255,255,255,.2);color:#fff;border:0;border-radius:8px;font-size:22px;line-height:1;width:44px;height:44px;cursor:pointer}
.kp-body{overflow:auto;padding:14px;background:#e9edf2;-webkit-overflow-scrolling:touch}
.kp-paper{background:#fff;color:#1a1a1a;border:2px solid #282828;outline:1px solid #282828;outline-offset:-7px;padding:26px 28px 22px;font:18px/1.45 Inter,Helvetica,Arial,sans-serif;max-width:800px;margin:0 auto}
.kp-pc{text-align:center;font-weight:800;font-size:26px;letter-spacing:.3px;text-transform:uppercase;line-height:1.2}
.kp-alamat{text-align:center;font-size:14px;color:#555;margin-top:4px}
.kp-garis{border:0;border-top:4px solid #0055a5;border-bottom:1.5px solid #fdb913;height:3px;margin:14px 0 16px}
.kp-judul{text-align:center;font-weight:800;font-size:23px;letter-spacing:.8px}
.kp-no{text-align:center;font-size:16px;color:#555;margin:2px 0 18px;word-break:break-all}
.kp-baris{display:grid;grid-template-columns:200px 18px 1fr;padding:7px 0;align-items:baseline}
.kp-baris b{font-weight:400;color:#555}
.kp-baris i{font-style:normal;color:#555}
.kp-baris span{font-weight:700;word-break:break-word}
.kp-bawah{display:grid;grid-template-columns:140px 1fr 300px;gap:16px;align-items:end;margin-top:22px}
.kp-qrbox{display:flex;flex-direction:column;align-items:center;gap:4px}
.kp-qr{width:124px;height:124px;image-rendering:pixelated;display:block}
.kp-qrcap{font-size:12px;color:#555;text-align:center;line-height:1.2}
.kp-total{border:1px solid #bec4cc;background:#f8f9fa;border-radius:8px;padding:10px 14px 12px;text-align:center;align-self:center}
.kp-total small{display:block;font-size:12px;letter-spacing:.08em;color:#555}
.kp-total strong{display:block;font-size:30px;font-weight:800;line-height:1.2}
.kp-ttd{text-align:center}
.kp-ttd div{font-size:15.5px;white-space:nowrap}
.kp-cap{position:relative;height:84px;margin:14px 0 0}
.kp-cap img{position:absolute;display:block}
.kp-cap .st{left:-6px;top:-8px;height:104px;max-width:112px;object-fit:contain;opacity:.88;z-index:1}
.kp-cap .tt{left:50%;margin-left:-36px;bottom:-6px;height:70px;max-width:128px;object-fit:contain;z-index:2}
.kp-nama{display:inline-block;font-weight:800;border-bottom:2px solid #1a1a1a;padding:0 10px 1px;min-width:170px;position:relative;z-index:3}
.kp-foot{display:flex;flex-wrap:wrap;gap:10px;padding:12px 14px;border-top:1px solid #dbe3e0;background:#fff}
.kp-foot button{flex:1 1 150px;margin:0;padding:15px 12px;font-size:18px;border-radius:10px;cursor:pointer;font-weight:700;border:2px solid var(--pri,#0055a5);background:var(--pri,#0055a5);color:#fff}
.kp-foot button.alt{background:#fff;color:var(--pri,#0055a5)}
@media (max-width:700px){
.kp-overlay{padding:0}
.kp-box{border-radius:0;height:100%}
.kp-paper{padding:18px 14px;font-size:17px}
.kp-pc{font-size:21px}
.kp-baris{grid-template-columns:1fr;gap:0}
.kp-baris i{display:none}
.kp-bawah{grid-template-columns:1fr;gap:18px}
.kp-total{align-self:stretch}
.kp-total strong{font-size:28px}
.kp-ttd{justify-self:center;width:300px;max-width:100%}
}
`;

let kpPenutup = null;

function tutupPreview() {
  const el = document.getElementById('kpOverlay');
  if (el) el.remove();
  document.body.style.overflow = '';
  if (kpPenutup) {
    document.removeEventListener('keydown', kpPenutup);
    kpPenutup = null;
  }
}

function previewKuitansi(pid, key) {
  const p = S.puk[pid] || {};
  const i = (S.iuran[pid] || {})[key];
  const c = S.pengaturan || {};
  if (!i || !i.nomorKuitansi || i.nomorKuitansi === '-') {
    toast('Kuitansi belum tersedia');
    return;
  }
  tutupPreview();

  if (!document.getElementById('kpGaya')) {
    const g = document.createElement('style');
    g.id = 'kpGaya';
    g.textContent = GAYA_PREVIEW;
    document.head.appendChild(g);
  }

  const qr = dataQR('KUITANSI COS|' + i.nomorKuitansi + '|' + (p.namaPerusahaan || '') + '|' + labelPeriode(key) + '|' + i.total + '|' + i.status);
  const baris = (label, nilai) => '<div class="kp-baris"><b>' + esc(label) + '</b><i>:</i><span>' + esc(nilai) + '</span></div>';
  const gbr = (src, kelas) => src ? '<img class="' + kelas + '" src="' + esc(src) + '" alt="">' : '';

  const kertas =
    '<div class="kp-paper">' +
    '<div class="kp-pc">' + esc(c.namaPC || 'Pengurus Cabang') + '</div>' +
    (c.alamat ? '<div class="kp-alamat">' + esc(c.alamat) + '</div>' : '') +
    '<hr class="kp-garis">' +
    '<div class="kp-judul">KUITANSI IURAN COS</div>' +
    '<div class="kp-no">No: ' + esc(i.nomorKuitansi) + '</div>' +
    baris('Telah terima dari', 'PUK ' + (p.namaPerusahaan || '')) +
    baris('Uang sejumlah', terbilangRupiah(i.total)) +
    baris('Untuk pembayaran', 'Iuran COS periode ' + labelPeriode(key) + ' (' + (i.jumlahAnggota || 0) + ' anggota)') +
    baris('Tanggal setor', fmtTgl(i.tanggalSetor)) +
    baris('Status', teksStatus(i)) +
    '<div class="kp-bawah">' +
    '<div class="kp-qrbox">' + (qr ? '<img class="kp-qr" src="' + qr + '" alt="Kode QR kuitansi">' : '') + '<div class="kp-qrcap">Pindai untuk memeriksa data</div></div>' +
    '<div class="kp-total"><small>JUMLAH DITERIMA</small><strong>' + esc(rp(i.total)) + '</strong></div>' +
    '<div class="kp-ttd"><div>' + esc((c.kota ? c.kota + ', ' : '') + fmtTgl(i.tanggalSetor)) + '</div>' +
    '<div>' + esc(c.jabatan || 'Bendahara') + '</div>' +
    '<div class="kp-cap">' + gbr(c.stempel, 'st') + gbr(c.ttd, 'tt') + '</div>' +
    '<span class="kp-nama">' + esc(c.bendahara || '') + '</span></div>' +
    '</div></div>';

  const el = document.createElement('div');
  el.id = 'kpOverlay';
  el.className = 'kp-overlay';
  el.innerHTML =
    '<div class="kp-box" role="dialog" aria-modal="true" aria-label="Pratinjau kuitansi">' +
    '<div class="kp-head"><h2>Pratinjau Kuitansi</h2><button type="button" class="kp-x" aria-label="Tutup">&times;</button></div>' +
    '<div class="kp-body">' + kertas + '</div>' +
    '<div class="kp-foot">' +
    '<button type="button" data-aksi="unduh">Unduh PDF</button>' +
    '<button type="button" class="alt" data-aksi="wa">Kirim WhatsApp</button>' +
    '<button type="button" class="alt" data-aksi="tutup">Tutup</button>' +
    '</div></div>';

  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('.kp-x')) {
      tutupPreview();
      return;
    }
    const b = e.target.closest('button[data-aksi]');
    if (!b) return;
    const aksi = b.dataset.aksi;
    if (aksi === 'tutup') tutupPreview();
    else if (aksi === 'unduh') unduhKuitansi(pid, key);
    else if (aksi === 'wa') kirimWA(pid, key);
  });

  kpPenutup = e => {
    if (e.key === 'Escape') tutupPreview();
  };
  document.addEventListener('keydown', kpPenutup);

  document.body.appendChild(el);
  document.body.style.overflow = 'hidden';
  el.querySelector('.kp-body').scrollTop = 0;
  el.querySelector('button[data-aksi="unduh"]').focus();
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
