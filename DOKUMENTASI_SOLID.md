# Dokumen Analisis: 15 Pelanggaran Prinsip SOLID pada LogistiKita

Dokumen ini memuat hasil skrining arsitektural dan kode program aplikasi **LogistiKita** terhadap prinsip-prinsip desain perangkat lunak objek-terorientasi (SOLID). Laporan ini merinci 15 pelanggaran yang ditemukan, dampak teknisnya, serta rekomendasi solusi refaktorisasi.

---

## 1. Single Responsibility Principle (SRP)

*Sebuah kelas/modul harus memiliki hanya satu tanggung jawab utama (satu alasan untuk berubah).*

### Pelanggaran 1: Penggabungan Router, Logger, dan Authenticator
*   **Lokasi Berkas:** [index.php](file:///c:/xampp/htdocs/logistikita/index.php)
*   **Detail Pelanggaran:** Berkas routing utama ini menangani pemetaan URL HTTP, memproses logika autentikasi JWT di dalam fungsi `verifyJWT()`, dan menulis log transaksi ke database MySQL di dalam fungsi `logApiRequest()`.
*   **Dampak:** Perubahan pada format token atau struktur database log akan memaksa modifikasi pada file routing utama.
*   **Rekomendasi:** Pisahkan routing ke berkas `Router`, buat kelas `JwtAuthenticator` untuk urusan token, dan delegasikan log ke kelas `RequestLogger`.

### Pelanggaran 2: Logika Perhitungan Tarif Ongkir Berada di Controller
*   **Lokasi Berkas:** [LogistikitaController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/LogistikitaController.php) (Fungsi `biayaPengiriman()`)
*   **Detail Pelanggaran:** Pengontrol memuat hardcoded harga dasar layanan ekspedisi (`$base_price = 10000`, dll.) serta menghitung premi asuransi barang secara langsung sebelum mengirim respons.
*   **Dampak:** Mengubah rumus tarif ekspedisi akan memaksa modifikasi pada kelas controller, yang seharusnya hanya bertugas mengantar request-response.
*   **Rekomendasi:** Pindahkan logika perhitungan ke dalam model bisnis atau service eksternal, seperti `PricingCalculatorService`.

### Pelanggaran 3: Query SQL String Ditulis Langsung di Controller
*   **Lokasi Berkas:** [LogistikitaController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/LogistikitaController.php) (Fungsi `getSystemLogs()`)
*   **Detail Pelanggaran:** Controller menulis dan mengeksekusi langsung query SQL mentah menggunakan properti database model secara langsung (`$this->pengirimanModel->conn->query()`).
*   **Dampak:** Melanggar batasan layer MVC; controller memiliki pengetahuan langsung tentang nama kolom database dan relasi SQL.
*   **Rekomendasi:** Pindahkan query ini ke dalam berkas Model khusus, misalnya `RiwayatStatusModel`.

### Pelanggaran 4: Pembuatan Token Autentikasi di dalam Controller
*   **Lokasi Berkas:** [AuthController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/AuthController.php) (Fungsi `login()`)
*   **Detail Pelanggaran:** Pengontrol secara manual melakukan `base64_encode` dan `json_encode` payload sesi untuk memformat token autentikasi.
*   **Dampak:** Perubahan arsitektur token (misal beralih ke token JWT standar industri) mengharuskan kita memodifikasi file controller.
*   **Rekomendasi:** Pindahkan pembuatan token ke kelas utilitas keamanan khusus seperti `TokenGeneratorService`.

### Pelanggaran 5: Pemicuan Webhook Jaringan HTTP pada Model Database
*   **Lokasi Berkas:** [Pengiriman.php](file:///c:/xampp/htdocs/logistikita/app/Models/Pengiriman.php) (Fungsi `updateStatus()`)
*   **Detail Pelanggaran:** Di dalam model, method update status memanggil helper `triggerWebhookCallback()` yang melakukan koneksi HTTP curl eksternal untuk mengupdate marketplace.
*   **Dampak:** Model persistensi database dicampuradukkan dengan urusan koneksi jaringan eksternal HTTP.
*   **Rekomendasi:** Terapkan *Domain Event* di mana update status memancarkan event `ShipmentStatusUpdated` yang nantinya ditangkap oleh event listener `WebhookNotifier`.

### Pelanggaran 6: Pencatatan Log Buku Besar Finansial (Pembukuan) di Model Pengiriman
*   **Lokasi Berkas:** [Pengiriman.php](file:///c:/xampp/htdocs/logistikita/app/Models/Pengiriman.php) (Fungsi `addPembukuan()`)
*   **Detail Pelanggaran:** Model `Pengiriman` memiliki tanggung jawab untuk menginsert record ke tabel lain (`pembukuan`) guna mencatat komisi kurir dan pengeluaran pajak.
*   **Dampak:** Model pengiriman harus berubah jika aturan format ledger/pembukuan perusahaan logistik berubah.
*   **Rekomendasi:** Buatlah kelas khusus `LedgerService` atau model database `Pembukuan` terpisah untuk mencatat entri akuntansi.

### Pelanggaran 7: Konektor API Bank Merangkap Penyimpan State Simulasi
*   **Lokasi Berkas:** [SmartBank.php](file:///c:/xampp/htdocs/logistikita/app/Models/SmartBank.php)
*   **Detail Pelanggaran:** Kelas ini bertanggung jawab mengirimkan cURL ke server bank, namun juga mensimulasikan mutasi saldo menggunakan session PHP (`$_SESSION`) jika koneksi bank offline.
*   **Dampak:** Berkas ini merangkap dua tugas: penghubung API riil dan penyimpan state saldo tiruan.
*   **Rekomendasi:** Pisahkan logika pemrosesan transaksi menjadi interface `BankGateway` dengan dua implementasi konkret: `RealSmartBankGateway` dan `SimulatedBankGateway`.

### Pelanggaran 8: File Konfigurasi Database Mengeluarkan Response HTTP
*   **Lokasi Berkas:** [Database.php](file:///c:/xampp/htdocs/logistikita/app/Config/Database.php) (Fungsi `getConnection()`)
*   **Detail Pelanggaran:** Saat koneksi database gagal, kelas konfigurasi ini memanggil `die(json_encode(...))` untuk langsung mengembalikan response error HTTP ke client.
*   **Dampak:** Kelas utility database tidak seharusnya mengetahui media pengiriman output (HTTP / CLI) dan menghentikan proses secara paksa.
*   **Rekomendasi:** Buat database melempar `DatabaseConnectionException` dan biarkan middleware/controller menangkap exception tersebut untuk diubah menjadi response JSON yang rapi.

### Pelanggaran 9: Pemilihan Algoritma Hashing Kriptografi di Model User
*   **Lokasi Berkas:** [User.php](file:///c:/xampp/htdocs/logistikita/app/Models/User.php) (Fungsi `create()`)
*   **Detail Pelanggaran:** Model user secara langsung memutuskan penggunaan `password_hash($password, PASSWORD_DEFAULT)` di dalam penyimpanan baris tabel database.
*   **Dampak:** Jika regulasi industri mengharuskan perubahan algoritma hashing (misal menggunakan Argon2id), model penyimpanan database terpaksa harus diubah.
*   **Rekomendasi:** Lakukan enkripsi password di level controller atau service autentikasi menggunakan interface `PasswordHasherInterface` sebelum diserahkan ke model.

---

## 2. Open/Closed Principle (OCP)

*Entitas perangkat lunak (kelas, modul, fungsi) harus terbuka untuk ekstensi (open for extension) tetapi tertutup untuk modifikasi (closed for modification).*

### Pelanggaran 10: Hardcoded Logika Alur Transisi Status & Payout
*   **Lokasi Berkas:** [Pengiriman.php](file:///c:/xampp/htdocs/logistikita/app/Models/Pengiriman.php) (Fungsi `updateStatus()`)
*   **Detail Pelanggaran:** Alur pencatatan log pembukuan keuangan dan pencairan gaji kurir diatur dengan percabangan `if-else` bertingkat yang kaku untuk memetakan status.
*   **Dampak:** Menambahkan status pengiriman baru (seperti `returned_to_sender` atau `undeliverable`) memaksa kita membongkar dan mengedit kembali kode di dalam fungsi `updateStatus()`.
*   **Rekomendasi:** Terapkan *State Design Pattern* di mana setiap state merepresentasikan objek tersendiri dengan callback event khusus.

### Pelanggaran 11: Validasi dan Penentuan Role Default pada Form Registrasi
*   **Lokasi Berkas:** [AuthController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/AuthController.php) (Fungsi `register()`)
*   **Detail Pelanggaran:** Aturan penetapan default role (`$role = isset($data['role']) ? $data['role'] : 'user'`) tertulis secara inline di dalam controller.
*   **Dampak:** Jika ada penambahan hak akses default, validasi email, atau registrasi dengan alur khusus per role, kita dipaksa merubah controller.
*   **Rekomendasi:** Gunakan pola *Factory Pattern* atau kelas service registrasi seperti `UserRegistrationHandler` untuk menyaring hak akses sebelum pembuatan user baru.

---

## 3. Liskov Substitution Principle (LSP)

*Subtipe harus dapat menggantikan tipe basisnya tanpa merusak integritas sistem.*

### Pelanggaran 12: Pewarisan BaseController untuk Fungsionalitas Helper
*   **Lokasi Berkas:** [BaseController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/BaseController.php)
*   **Detail Pelanggaran:** `AuthController` dan `LogistikitaController` mewarisi `BaseController` untuk menggunakan method pembantu seperti `sendResponse()` dan `getRequestData()`.
*   **Dampak:** Jika ada subtipe controller baru yang hanya melayani render view statis (tidak butuh request payload), subtipe tersebut tetap mewarisi method `getRequestData()` yang tidak kompatibel dengannya. Pewarisan dilakukan hanya untuk berbagi kode helper (*code sharing*), bukan hubungan logis *is-a*.
*   **Rekomendasi:** Gunakan komposisi (Dependency Injection utilitas response/request) atau PHP Trait daripada pewarisan kelas basis.

---

## 4. Interface Segregation Principle (ISP)

*Klien tidak boleh dipaksa bergantung pada metode-metode antarmuka yang tidak digunakannya.*

### Pelanggaran 13: Expose Penuh Koneksi mysqli pada Model Data
*   **Lokasi Berkas:** [Pengiriman.php](file:///c:/xampp/htdocs/logistikita/app/Models/Pengiriman.php) (Constructor `__construct()`)
*   **Detail Pelanggaran:** Model menerima objek koneksi database konkret `mysqli` secara utuh.
*   **Dampak:** Model pengiriman dapat mengakses semua metode `mysqli` (seperti memilih database lain, mengubah charset koneksi, mematikan thread koneksi database) padahal model hanya butuh mengirim query dan membersihkan string input.
*   **Rekomendasi:** Buat abstraksi interface query sederhana (misalnya `DatabaseConnectionInterface` yang hanya memiliki method `query()` dan `escape()`) dan inject interface tersebut ke model.

---

## 5. Dependency Inversion Principle (DIP)

*Bergantunglah pada abstraksi (interface), jangan pada implementasi konkret.*

### Pelanggaran 14: Instansiasi Model Konkret di dalam Constructor Controller
*   **Lokasi Berkas:** [LogistikitaController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/LogistikitaController.php#L8) & [AuthController.php](file:///c:/xampp/htdocs/logistikita/app/Controllers/AuthController.php#L8)
*   **Detail Pelanggaran:** Kedua controller menginisialisasi langsung objek model konkret di dalam constructornya (`new Pengiriman($db)` dan `new User($db)`).
*   **Dampak:** Terjadi keterikatan erat (tight coupling). Kita tidak dapat melakukan pengujian (unit testing) controller secara mandiri menggunakan mock model.
*   **Rekomendasi:** Lakukan *Dependency Injection* melalui parameter constructor dengan tipe interface.

### Pelanggaran 15: Pemanggilan Method Statis Kelas Konkret Eksternal (SmartBank)
*   **Lokasi Berkas:** [Pengiriman.php](file:///c:/xampp/htdocs/logistikita/app/Models/Pengiriman.php#L143)
*   **Detail Pelanggaran:** Model pengiriman langsung memanggil secara statis kelas konkret `SmartBank::processTransaction()`.
*   **Dampak:** Model terkunci hanya pada satu jenis bank (SmartBank). Jika ingin mengganti vendor bank/gateway pembayaran lain di masa mendatang, kita harus mendesain ulang model database pengiriman.
*   **Rekomendasi:** Inject kelas pembayar via constructor menggunakan interface abstraksi seperti `PaymentGatewayInterface`.
