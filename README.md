# Mobile POS Inventory System — API Test Automation

Proyek ini adalah test automation suite untuk **Backend API Mobile POS & Inventory System**. Dibangun menggunakan **Playwright** untuk pengujian API end-to-end, dan menggunakan **Allure** untuk pelaporan hasil testing.

## 📊 Live Test Report
Hasil eksekusi automation testing terbaru (berjalan otomatis via CI/CD setiap ada perubahan di branch `main`) dapat dilihat secara online pada link berikut:

> 👉 **[Buka Allure Test Report](https://fridoa.github.io/pointofsale-api-test/)** 
*(Note: Ganti URL di atas dengan link GitHub Pages repositori kamu, contoh: https://username.github.io/repository-name/)*

---

## 🛠️ Tech Stack
- **Framework:** [Playwright](https://playwright.dev/)
- **Language:** TypeScript
- **Reporter:** [Allure Report](https://allurereport.org/)
- **CI/CD:** GitHub Actions

## 🚀 Cara Menjalankan di Lokal (Local Development)

### 1. Instalasi
Pastikan Node.js sudah terinstal, lalu jalankan:
```bash
npm install
```

### 2. Setup Environment Variable
Buat file `.env` di root folder proyek dan isi dengan URL backend (IP EC2/Localhost):
```env
BASE_URL=http://<IP-ADDRESS-EC2>:3000/api/v1
```

### 3. Menjalankan Test
Terdapat beberapa skrip yang bisa digunakan untuk menjalankan testing:

```bash
# Menjalankan seluruh test case
npm test

# Menjalankan HANYA smoke test (test case kritikal)
npm run test:smoke

# Menjalankan HANYA regression test (semua test case)
npm run test:regression
```

### 4. Melihat Laporan Allure (Local)
Setelah test selesai dijalankan, generate dan buka laporannya dengan perintah:
```bash
npm run allure:generate
npm run allure:open
```

## 🔄 CI/CD Pipeline
Proyek ini menggunakan GitHub Actions dengan alur:
1. **Smoke Test:** Berjalan cepat untuk memastikan API dalam kondisi hidup. Jika gagal, pipeline berhenti.
2. **Regression Test:** Berjalan penuh untuk semua test case.
3. **Allure Report Generation:** Hasil testing digenerate dan secara otomatis di-deploy ke **GitHub Pages**.
