# Konteks Proyek SIMTAQ untuk Google Antigravity Agent

- **Nama Aplikasi**: SIMTAQ (Sistem Informasi Monitoring Tahfiz Al-Qur’an)
- **Instansi**: MAN 2 Kabupaten Gorontalo bekerja sama dengan Yayasan Abulyatama Indonesia Gorontalo
- **Pengembang Aplikasi**: Herman Susanto Buhungo, S.Pd.

## Arsitektur File di Folder Workspace
1. `index.html`: Aplikasi Frontend Utama (HTML5 + Tailwind CSS + Vanilla JS + YouTube IFrame API).
2. `Code.gs`: Kode Backend Google Apps Script yang terhubung ke Database Google Spreadsheet & Google Drive yang sudah ada.

## Aturan Penting untuk AI Agent Antigravity
- **JANGAN MEMBUAT DATABASE BARU**: Gunakan fungsi `callCloudBackend(action, payload)` di `index.html` yang sudah terhubung ke `DEFAULT_GAS_WEB_APP_URL` (`doGet` & `doPost` di `Code.gs`).
- **Pertahankan 6 Sheet Utama**: `Data_Santri`, `Data_Ustadz`, `Setoran_Hafalan`, `Target_Hafalan`, `Musik_Latar`, dan `Pengaturan_Pejabat`, serta sheet akun `Data_Pengguna` yang dikelola oleh Administrator.
- **Sistem Autentikasi Mandiri**: Form login satu pintu (hanya Username & Password). Pengguna tidak perlu mendaftar sendiri; akun dibuat oleh Admin. Akun admin default: username `admin`, password `admin123`.
- **Pertahankan Desain Mobile-First**: Tanpa geser kiri-kanan (`overflow-x: hidden`), menu menggunakan tombol garis 3 (`☰`), dan tabel otomatis menjadi kartu vertikal di layar HP.