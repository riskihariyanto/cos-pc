# PROJECT_STATE — Aplikasi Pencatatan Iuran COS (Check-off System)

Terakhir diperbarui: 9 Oktober 2026
Fase: Kode modular lengkap tersusun, belum diuji di browser dan belum di-deploy

## Tujuan
PWA mobile-friendly untuk mencatat setoran iuran COS. PUK (Pengurus Unit Kerja) input setoran per perusahaan, PC (Pengurus Cabang) memantau dan memverifikasi real-time.

## Stack (final)
- Frontend: HTML + CSS + JavaScript biasa (tanpa build, tanpa npm), script klasik berurutan agar fungsi global untuk `onclick` tetap jalan
- Backend: Firebase Auth (email/sandi) + Realtime Database
- Library CDN: Firebase compat 10.12.2, jsPDF 2.5.1, qrcode-generator 1.4.4
- PWA: manifest.json (ikon SVG inline) + sw.js (network-first untuk file lokal, cache-first untuk CDN, Firebase tidak di-cache)

## Struktur File
```
index.html           shell markup + urutan script
manifest.json        PWA manifest
sw.js                service worker (naikkan VERSI jika SHELL berubah)
database.rules.json  aturan keamanan RTDB (ditempel manual di Firebase Console)
css/style.css
js/config.js         firebaseConfig (WAJIB DIISI), init, BULAN, ROMAWI
js/util.js           $, rp, esc, format tanggal/periode, toast, busy, pesan, jalankan, terbilang
js/state.js          objek S, isPC, allIuran, sortedPUK, listen, attach, detach, resetData
js/kuitansi.js       gambarQR, buatPDF, namaFile, unduhKuitansi, kirimWA
js/puk.js            viewSetor, submitSetor, nextNomor, viewRiwayat, viewAnggota, tambah/toggle/hapusAnggota, syncJumlah
js/pc.js             viewRekap, setPeriode, viewVerifikasi, verifikasiIuran, tolakIuran, viewPUK, tambahPUK, editPUK, viewLaporan, setTahunLap, exportCSV, viewPengaturan, muatGambar, simpanPengaturan
js/ui.js             VIEWS, TABS_PC, TABS_PUK, showTab, render
js/auth.js           onAuthStateChanged, doLogin, doLogout, registrasi service worker
```
Urutan load di index.html: config, util, state, kuitansi, puk, pc, ui, auth. Nama fungsi global jangan diubah (dipanggil dari onclick).

## Struktur Data (Realtime Database)
- `users/{uid}`: role ('pc' | 'puk'), pukId (khusus PUK), nama, email
- `puk/{pukId}`: namaPerusahaan, namaKetua, jumlahAnggota, tarifPerAnggota, email
- `anggota/{pukId}/{id}`: nama, aktif
- `iuran/{pukId}/{YYYY-MM}`: periode, total, tanggalSetor, status (Pending | Lunas | Ditolak), nomorKuitansi, jumlahAnggota, tarifPerAnggota, selisih, dibuat, diverifikasiOleh, tanggalVerifikasi
- `counter/{tahun}`: nomor urut terakhir kuitansi
- `pengaturan`: namaPC, alamat, kota, bendahara, jabatan, stempel (base64 PNG), ttd (base64 PNG)

## Aturan Bisnis
- Tarif iuran berbeda per PUK, disimpan sebagai tarifPerAnggota; total seharusnya = jumlahAnggota × tarifPerAnggota
- Nominal beda dari seharusnya: PUK diminta konfirmasi, selisih dicatat dan tampil di verifikasi PC
- Satu setoran per PUK per periode; boleh kirim ulang hanya jika berstatus Ditolak
- Nomor kuitansi: `001/COS/PUK-NamaPT/{Romawi bulan}/{tahun}`, urutan global per tahun (transaksi counter)
- Hanya PC yang bisa mengubah status ke Lunas atau Ditolak (ditegakkan oleh rules)
- Status periode lampau tanpa setoran tampil Menunggak; periode berjalan/depan tampil Belum Setor

## Setup yang Dibutuhkan (belum dikerjakan)
1. Isi `firebaseConfig` di js/config.js
2. Aktifkan Email/Password di Firebase Authentication
3. Tempel database.rules.json di Realtime Database → Rules, lalu Publish
4. Buat akun PC pertama manual: tambah user di Authentication, lalu node `users/{UID}` berisi role "pc" dan nama
5. Login sebagai PC, isi Pengaturan (nama PC, penandatangan, stempel, tanda tangan), lalu tambah PUK

## Batasan yang Diketahui
- Kode belum pernah dijalankan di browser; tahap berikutnya adalah uji menyeluruh
- Kirim WhatsApp manual lewat fitur bagikan file HP (atau unduh PDF + wa.me); pengiriman otomatis butuh backend
- QR di kuitansi hanya berisi teks ringkasan, belum ada halaman verifikasi online
- Jumlah anggota otomatis dihitung dari daftar anggota begitu daftar terisi (daftar parsial akan menimpa angka awal dari PC)
- Counter nomor kuitansi global per tahun; nomor bisa melompat jika penyimpanan setoran gagal setelah nomor terbit
- Sandi awal PUK dibuat PC; belum ada fitur reset sandi atau hapus PUK di UI
- Gambar stempel/tanda tangan disimpan base64 di RTDB (maks sekitar 800 KB per gambar)

## Progres
- [x] Konsep alur, fitur, struktur data
- [x] Keputusan stack
- [x] Aplikasi modular (index, css, 8 modul js)
- [x] Aturan keamanan database
- [x] manifest.json dan sw.js
- [ ] Isi config Firebase dan setup akun PC pertama
- [ ] Uji end-to-end (setor, verifikasi, PDF, CSV, offline)
- [ ] Deploy (GitHub Pages atau Firebase Hosting)
- [ ] Halaman verifikasi kuitansi via QR
- [ ] Reset sandi, hapus/nonaktifkan PUK
- [ ] Pengiriman WhatsApp/Email otomatis (opsional, butuh backend)
