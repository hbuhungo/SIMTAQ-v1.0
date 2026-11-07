# Konteks Proyek SIMTAQ untuk Google Antigravity Agent

- **Nama Aplikasi**: SIMTAQ (Sistem Informasi Monitoring Tahfiz Al-Qur’an)
- **Instansi**: MAN 2 Kabupaten Gorontalo bekerja sama dengan Yayasan Abulyatama Indonesia Gorontalo
- **Pengembang Aplikasi**: Herman Susanto Buhungo, S.Pd.

## Arsitektur Aplikasi & Database (Migrasi Modern Firebase)
1. `index.html`: Aplikasi Frontend Utama (HTML5 + Tailwind CSS + Vanilla JS + Firebase SDK v10 Compat + YouTube IFrame API). Dideploy ke GitHub Pages (`https://hbuhungo.github.io/SIMTAQ-v1.0/`).
2. **Database Backend**: Firebase Firestore (Realtime NoSQL Database) untuk sinkronisasi sub-detik dua arah ke seluruh komputer, laptop, dan HP tanpa polling.
3. **Penyimpanan Video**: Firebase Cloud Storage untuk rekaman video hafalan santri (direct streaming upload, anti kehabisan memori / anti Out of Memory).

## Struktur Data Utama (Collections di Firebase Firestore)
1. `santri`: Data identitas santri (NIS, nama, kelas, halaqah, orang tua, kontak, status).
2. `ustadz`: Data pembimbing ustadz/ustadzah (NIP, nama, lembaga, halaqah, kontak, status).
3. `setoran`: Riwayat setoran hafalan & video (ID, tanggal, santriId, NIS, nama, surat, ayat, juz, nilai, 6 indikator penilaian, ustadz, catatan, hasVideo, videoUrl).
4. `target`: Target hafalan santri (santriId, target, tanggal, status).
5. `pengguna`: Akun pengguna untuk autentikasi satu pintu (username, password, nama, peran, refId, status).
6. `playlist`: Daftar audio murotal / link YouTube murotal Al-Qur'an.
7. `pejabat`: Pengaturan profil kepala madrasah dan ketua yayasan untuk rapor hafalan santri.

## Aturan Penting untuk AI Agent Antigravity
- **Sistem Autentikasi Mandiri**: Form login satu pintu (hanya Username & Password). Pengguna tidak perlu mendaftar sendiri; akun dibuat oleh Admin. Akun admin default: username `admin`, password `admin123`.
- **Pertahankan Desain Mobile-First**: Tanpa geser kiri-kanan (`overflow-x: hidden`), menu menggunakan tombol garis 3 (`☰`), dan tabel otomatis menjadi kartu vertikal di layar HP.
- **Real-time Listener**: Gunakan Firestore listener `onSnapshot` agar seluruh perubahan data di satu perangkat langsung terpantul otomatis secara instan di perangkat lain tanpa perlu refresh.
- **Direct Video Upload**: Unggah berkas rekaman video langsung ke Firebase Cloud Storage dengan `storageRef.put(file)` dan simpan `downloadURL` permanennya.
