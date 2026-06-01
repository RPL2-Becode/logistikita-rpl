 BAB 1. DESKRIPSI APLIKASI DAN KONTEKS SISTEM

1. Deskripsi Aplikasi
LogistiKita merupakan sebuah Sistem Informasi Manajemen Ekspedisi dan Distribusi Logistik berbasis web yang dibangun sebagai solusi komprehensif untuk mendigitalkan proses pemindahan barang secara fisik. Dalam lanskap industri digital, perdagangan elektronik (e-commerce) tidak akan pernah terwujud tanpa adanya tulang punggung distribusi yang solid. LogistiKita hadir untuk mengisi ruang tersebut, bertindak sebagai mesin penggerak (engine) yang mengubah kesepakatan jual-beli di dunia maya menjadi serangkaian aksi pemindahan barang yang dapat diukur, dilacak, dan divalidasi di dunia nyata. Aplikasi ini didesain menggunakan paradigma arsitektur Model-View-Controller (MVC) yang memisahkan logika bisnis (backend), manajemen basis data, dan antarmuka pengguna (frontend) secara tegas. Pemisahan ini memastikan bahwa sistem mampu memproses ratusan hingga ribuan permintaan pengiriman secara serentak tanpa mengalami penurunan performa yang berarti.

Dari perspektif teknis dan operasional, LogistiKita bekerja dengan prinsip data-driven logistics. Proses bisnis aplikasi ini dimulai secara otomatis ketika server menerima sekumpulan data mentah yang diinjeksi oleh aplikasi pihak ketiga (seperti Marketplace). Data mentah ini memuat informasi krusial berupa identitas pengirim, alamat asal, alamat tujuan akhir, spesifikasi dimensi/berat barang, serta jenis layanan yang dipilih. Mesin komputasi LogistiKita kemudian akan memproses data tersebut untuk menerbitkan sebuah nomor resi identifikasi (tracking number) yang unik. Setelah pesanan tervalidasi, sistem akan mendaftarkan paket tersebut ke dalam antrean dispatch internal, lalu menyebarkan penugasan tersebut kepada armada kurir yang terdeteksi sedang berstatus standby di lapangan.

Selain manajemen penugasan, keunggulan utama dari deskripsi operasional aplikasi ini adalah kemampuannya dalam mencatat rekam jejak (audit trail). Seluruh siklus hidup sebuah paket—mulai dari titik penjemputan awal di gudang penjual, proses transit antar zona, hingga detik di mana paket diserahkan ke tangan pembeli—akan direkam secara presisi ke dalam basis data. Sistem pencatatan riwayat yang persisten ini tidak hanya berfungsi sebagai bentuk transparansi bagi konsumen, tetapi juga menjadi instrumen pelaporan yang valid bagi manajemen perusahaan logistik untuk mengevaluasi kecepatan dan efisiensi armada mereka di lapangan.

2. Tujuan Aplikasi
Pengembangan aplikasi perangkat lunak LogistiKita dilandasi oleh urgensi untuk menyelesaikan berbagai hambatan operasional yang kerap terjadi dalam sistem distribusi konvensional. Secara garis besar, aplikasi ini dikembangkan dengan tiga tujuan utama yang saling berkaitan erat:

Pertama, Mengotomatisasi Perhitungan Tarif secara Dinamis dan Transparan.
Pada sistem distribusi tradisional, penentuan harga ongkos kirim seringkali bersifat buram atau melibatkan proses negosiasi yang memakan waktu. Tujuan utama dari aplikasi LogistiKita adalah mengeliminasi bias tersebut dengan menyediakan modul kalkulator tarif algoritmik. Sistem ini dirancang untuk menghitung biaya secara otomatis pada hitungan milidetik (real-time) dengan menjumlahkan tarif dasar, mengalikannya dengan bobot barang (dalam hitungan kilogram), serta menyesuaikannya dengan premi jenis layanan (Reguler vs Express). Hal ini memastikan bahwa setiap pelanggan dalam ekosistem mendapatkan harga yang seragam, adil, dan transparan tanpa ada biaya tersembunyi.
Kedua, Menciptakan Ekosistem Pelacakan Terpadu (Real-Time Tracking).
Kecemasan konsumen terhadap lokasi barang kiriman mereka adalah salah satu isu terbesar dalam bisnis ekspedisi. Tujuan sistem LogistiKita adalah menyediakan antarmuka pelacakan visual yang memungkinkan pengguna melihat pergerakan barang mereka dari menit ke menit. Sistem ini membebaskan kurir dari keharusan menelepon pusat kendali; kurir cukup menekan satu tombol pembaruan status di aplikasi gawai mereka, dan server LogistiKita akan seketika itu juga memancarkan status terbaru tersebut kepada database, yang kemudian akan direfleksikan ke layar pelanggan yang sedang melacak nomor resi tersebut.

Ketiga, Mengeksekusi Penagihan Lintas-Aplikasi (Cross-System Billing).
Tujuan pamungkas dari aplikasi ini adalah untuk mencapai kematangan integrasi dengan pusat keuangan digital. LogistiKita ditargetkan untuk tidak berdiri sendiri, melainkan secara aktif berkomunikasi dengan server perbankan (SmartBank) melalui protokol API. Tujuannya adalah agar proses pembayaran ongkos kirim dapat ditarik secara elektronik tanpa campur tangan manusia. Sistem hanya akan melepaskan surat jalan kepada kurir lapangan jika dan hanya jika server bank memberikan kode respons konfirmasi bahwa uang pelanggan telah sukses didebit. Ini menjamin nol risiko gagal bayar bagi perusahaan logistik.

3. Peran Aplikasi dalam Ekosistem
Dalam simulasi ekosistem Rekayasa Perangkat Lunak (RPL) yang menggabungkan entitas Marketplace, SupplierHub, POS, dan perbankan, LogistiKita bukan sekadar fitur pelengkap. LogistiKita memegang peran makro-ekonomi yang sangat absolut sebagai Penyelesai Rantai Pasok Fisik (Physical Supply Chain Resolver) dan Penggerak Biaya (Cost Driver).

Sebagai Penyelesai Rantai Pasok, peran LogistiKita adalah menjadi eksekutor dunia nyata. Aplikasi e-commerce di dalam ekosistem ini pada dasarnya hanyalah penyedia etalase katalog dan pencatat perpindahan kepemilikan. Transaksi jual-beli puluhan juta rupiah di sebuah Marketplace tidak akan pernah memiliki nilai nyata apabila barang fisiknya tidak pernah diantarkan ke rumah konsumen. Kehadiran LogistiKita menjamin bahwa siklus transaksi tersebut ditutup dengan serah terima fisik. LogistiKita adalah kaki dan tangan dari keseluruhan ekosistem perdagangan ini.

Dari sudut pandang regulasi ekonomi, peran LogistiKita justru jauh lebih krusial, yakni sebagai Cost Driver (Pemicu Biaya) yang memegang peranan Money Sink (Penyerap Inflasi). Di dalam simulasi ekonomi digital, uang dapat berpindah dengan sangat cepat dan terakumulasi di pihak penjual. Untuk meniru ekonomi dunia nyata, setiap transaksi harus dikenakan ongkos operasional. LogistiKita akan menarik ongkos kirim dari pembeli, namun LogistiKita diwajibkan oleh aturan sistem untuk memotong 5% dari pendapatannya untuk dibuang/disetorkan ke perbendaharaan SmartBank sebagai pajak layanan infrastruktur. Potongan 5% yang terus-menerus terjadi di setiap pergerakan paket ini secara perlahan akan menyedot uang keluar dari peredaran warga ekosistem, sehingga mencegah terjadinya suplai uang berlebih (hyperinflation) dan menjaga agar simulasi ekonomi tetap stabil dan masuk akal.





4. Identifikasi Stakeholder (Aktor Sistem)
Sistem LogistiKita membagi batas kewenangan (Access Control) kepada empat pihak/entitas utama yang saling berinteraksi namun memiliki kepentingan yang berbeda-beda:

1. Aktor: User (Pengirim / Pelanggan / UMKM)
Ini adalah kelompok aktor eksternal yang jumlahnya paling masif dalam sistem. Mereka adalah pihak yang memicu hidup matinya bisnis logistik. Kepentingan utama User saat mengakses aplikasi adalah kepraktisan: mereka ingin memasukkan alamat tujuan, melihat harga yang muncul secara instan, menyetujui pemotongan saldo SmartBank, dan mendapatkan nomor resi yang bisa langsung dicek. Kepuasan entitas ini bergantung sepenuhnya pada akurasi dan kecepatan pembaruan status barang.

2. Aktor: Kurir (Armada Lapangan)
Ini adalah kelompok pekerja operasional yang bergerak secara dinamis. Mereka tidak mengurus transaksi uang secara langsung, melainkan fokus pada eksekusi fisik. Melalui Dashboard Kurir, sistem memberikan mereka daftar tugas harian (dispatch list) yang rapi dan terurut berdasarkan status "Menunggu Penjemputan". Motivasi utama entitas ini adalah menyelesaikan sebanyak mungkin tugas pengantaran hingga berstatus "Delivered", karena dari sanalah server akan merekam produktivitas mereka dan menghitung nilai komisi atau upah kerja harian yang berhak mereka cairkan ke rekening pribadi mereka nantinya.

3. Aktor: Admin (Pusat Pengendali / LogistiKita HQ)
Ini adalah aktor internal yang bertindak bagaikan jenderal di ruang komando. Berbeda dengan Kurir yang melihat secara parsial, Admin memiliki pandangan dewa (god-eye view) terhadap keseluruhan sistem. Wewenang Admin sangat luas, mulai dari memvalidasi pesanan yang anomali, mendaftarkan armada kurir baru ke dalam basis data `users`, memantau pergerakan grafik pendapatan operasional, hingga mengawasi konsol log gerbang API (API Gateway Console) untuk mendeteksi apabila terjadi serangan siber atau kegagalan pertukaran data (timeout) antara server logistik dengan server Marketplace maupun SmartBank. Admin bertugas memastikan perusahaan tetap beroperasi dan untung.

4. Aktor: SmartBank (Otoritas Lintas-Sistem)
Meskipun secara teknis merupakan aplikasi eksternal (dikelola oleh kelompok mahasiswa yang berbeda), SmartBank adalah pemegang kebijakan mutlak (stakeholder absolut) bagi LogistiKita. LogistiKita tidak memiliki kuasa untuk memegang saldo pengguna secara mandiri. Oleh karena itu, LogistiKita berstatus sangat bergantung (highly dependent) kepada SmartBank. Jika API SmartBank menolak transaksi karena pelanggan kehabisan uang, LogistiKita secara sepihak diwajibkan untuk menghentikan seluruh proses pickup paket tersebut. Hubungan simbiosis ini adalah contoh nyata penerapan prinsip Stateless Finance pada arsitektur sistem informasi modern.









2. Use Case / Fitur Utama

Bagian ini mengidentifikasi kebutuhan fungsional sistem LogistiKita berdasarkan skema ekosistem ekonomi digital terintegrasi. Fitur-fitur utama di bawah ini dirancang untuk mendefinisikan interaksi antara aktor manusia (User, Kurir, Admin) serta interaksi otomatis antar-sistem (Machine-to-Machine API).

2.1 Fitur 1: Request Pengiriman (`/logistikita/request_pengiriman`)
Deskripsi Fungsional: Fitur ini berfungsi untuk menerima dan meregistrasikan permintaan pengiriman paket baru ke dalam sistem. Fitur ini tidak berdiri sendiri, melainkan dipicu (triggered) secara otomatis saat ada transaksi belanja sukses dari aplikasi Marketplace atau pemesanan bahan baku di SupplierHub.
Perilaku Sistem: Sistem menerima data alamat asal, alamat tujuan, dimensi/berat paket, dan identitas pengirim. Sistem kemudian memvalidasi kelengkapan parameter, secara otomatis memicu generator nomor resi unik, dan mendaftarkan entitas pengiriman tersebut ke dalam basis data dengan status awal `pending` (menunggu konfirmasi pembayaran).

2.2 Fitur 2: Tracking Status (`/logistikita/tracking_status`)
Deskripsi Fungsional: Fitur ini memfasilitasi pelacakan pergerakan paket secara real-time dari hulu ke hilir.
Perilaku Sistem: Fitur ini memiliki dua antarmuka akses:
    1.  Read Operation (GET): Diakses oleh User/Pelanggan untuk melihat linimasa perjalanan paket mereka berdasarkan nomor resi.
    2.  Write Operation (POST): Diakses oleh Kurir melalui gawai lapangan atau Admin melalui konsol pusat untuk memperbarui koordinat posisi dan status paket (misal dari `pickup` -> `transit` -> `delivered`). Setiap pembaruan wajib disimpan ke dalam tabel sejarah log status (`riwayat_status`) untuk menjamin transparansi pelacakan.

2.3 Fitur 3: Biaya Pengiriman (`/logistikita/biaya_pengiriman`)
Deskripsi Fungsional: Fitur kalkulator ongkos kirim (ongkir) otomatis yang digunakan oleh sistem untuk menentukan tarif pengiriman sebelum transaksi disahkan.
Perilaku Sistem: Sistem menerima parameter jarak pengiriman (dalam kilometer) dan bobot fisik paket (dalam kilogram). Menggunakan formula tarif dasar logistik yang telah ditentukan, sistem secara dinamis menghasilkan rincian ongkir. Fitur ini juga mendukung asuransi tambahan untuk barang berharga tinggi guna meminimalisir risiko kehilangan barang fisik di jalan.

 2.4 Fitur 4: Pembayaran Logistik (`/logistikita/pembayaran_logistik`)
Deskripsi Fungsional: Fitur integrasi pembayaran ongkir yang menghubungkan LogistiKita dengan otoritas keuangan pusat (SmartBank).
Perilaku Sistem: LogistiKita bertindak sebagai penagih (biller). Sistem akan membuat kode transaksi pembayaran logistik, lalu mengirimkan permintaan debit saldo (payment request) ke API SmartBank. Jika status respons dari SmartBank bernilai sukses, sistem LogistiKita akan memperbarui kolom status pembayaran (`is_paid = TRUE`) dan mengubah status paket secara otomatis menjadi `menunggu_pickup` agar dapat diambil oleh Kurir.



 2.5 Fitur 5: Biaya Layanan Logistik (`/logistikita/biaya_layanan_logistik`)
Deskripsi Fungsional: Fitur akuntansi operasional yang bertugas memotong biaya layanan (fee) logistik sebesar 5% atau flat Rp 5.000 sesuai aturan ekonomi ekosistem.
Perilaku Sistem: Setiap kali terjadi transaksi pengiriman yang terbayar lunas, sistem akan menyisihkan 5% dari biaya pengapalan sebagai "biaya layanan logistik". Modul ini bertugas menghitung akumulasi total biaya layanan logistik secara periodik untuk dilaporkan pada dashboard keuangan Admin dan disetorkan sebagai tax/fee ekosistem ke SmartBank.

3. Diagram Arsitektur

Arsitektur aplikasi LogistiKita dibangun dengan mematuhi pola desain Model-View-Controller (MVC) Native yang terintegrasi secara stateless melalui API Gateway / Integrator menuju entitas luar (SmartBank, Marketplace, SupplierHub).

3.1 Blok Arsitektur Internal MVC
Pola komunikasi internal sistem LogistiKita dijabarkan dalam diagram blok berikut:









3.2 Diagram Integrasi Lintas-Sistem Ekosistem RPL

Diagram ini menunjukkan bagaimana LogistiKita berinteraksi dengan aplikasi kelompok lain melalui API Gateway:



4. Flow Proses (Input - Proses - Output)
Di bawah ini adalah penjelasan terperinci mengenai alur logika sistem (IPO) untuk masing-masing dari lima fitur utama LogistiKita:

4.1 IPO Fitur 1: Request Pengiriman
Input:
    `user_id` (Integer - ID pengirim barang)
    `penerima_nama` (String - Nama lengkap penerima)
    `penerima_telp` (String - Kontak penerima)
    `penerima_alamat` (Text - Alamat lengkap tujuan)
    `berat` (Float - Berat paket dalam satuan kg)
    `layanan` (String - Pilihan tipe layanan: "Reguler" / "Express")
    `biaya_ongkir` (Decimal - Ongkos kirim yang telah dihitung)
Proses:
    1.  Controller menangkap request POST dan melakukan validasi kelengkapan parameter input.
    2.  Model memicu fungsi generator alfanumerik untuk membuat nomor resi unik (contoh format: `LKT-[RANDOM_STRING]`).
    3.  Menyimpan entitas transaksi ke dalam tabel `pengiriman` dengan parameter `is_paid = FALSE` dan `status = 'pending'`.

Output:
    Objek JSON: `status: 'success'`, `message: 'Request pengiriman berhasil dibuat'`, dan payload data `resi` beserta rincian pengiriman.
4.2 IPO Fitur 2: Tracking Status
Input:
    `resi` (String - Nomor resi paket)
   `status` (String - Status baru: `menunggu_pickup` / `pickup` / `transit` / `delivery` / `delivered`)
    `lokasi` (String - Posisi checkpoint kurir, misal: "Admin HQ" atau "Kurir Hub Cawang")
    `keterangan` (String - Informasi tambahan, misal: "Kurir sedang menuju alamat penerima")
Proses:
    1.  Sistem melakukan pencarian data berdasarkan parameter `resi` di tabel `pengiriman`.
    2.  Jika ditemukan, sistem memperbarui nilai kolom `status` di tabel `pengiriman` sesuai input baru.
    3.  Sistem merekam entri log baru ke dalam tabel `riwayat_status` (mencatat `pengiriman_id`, `status`, `lokasi`, `keterangan`, dan stempel waktu `waktu_update`).
Output:
    Objek JSON: `status: 'success'`, `message: 'Status pengiriman berhasil diupdate'`.

4.3 IPO Fitur 3: Biaya Pengiriman
Input:
    `asal` (String - Alamat/Kota pengirim)
    `tujuan` (String - Alamat/Kota penerima)
    `berat` (Float - Bobot paket dalam kg)
    `layanan` (String - Jenis layanan ekspedisi)
    `asuransi` (Boolean - Pilihan asuransi tambahan)
    `nilai_barang` (Decimal - Nilai barang jika mengaktifkan asuransi)
Proses:
    1.  Sistem mengambil tarif dasar ekspedisi logistik (contoh: Rp 10.000 untuk Reguler, Rp 15.000 untuk Express).
    2.  Sistem mengalikan tarif dasar tersebut dengan pembulatan ke atas dari berat barang (`ceil(berat)`).
    3.  Jika parameter `asuransi` bernilai `true`, sistem menambahkan biaya premi sebesar 0.5% dari parameter `nilai_barang`.
    4.  Menghitung akumulasi akhir biaya logistik.
Output:
    Objek JSON berisi rincian: `asal`, `tujuan`, `berat`, `biaya_ongkir`, `asuransi`, dan `total_biaya`.

 4.4 IPO Fitur 4: Pembayaran Logistik
Input:
    `pengiriman_id` (Integer - ID baris tabel pengiriman)
    `bank_ref` (String - Nomor referensi transaksi dari SmartBank)
    `amount` (Decimal - Jumlah uang yang sukses didebit)
Proses:
    1.  Menerima callback/notifikasi sukses dari gerbang SmartBank atas transaksi tagihan ongkir.
    2.  Sistem memperbarui kolom `is_paid = TRUE` dan mengubah `status` paket menjadi `menunggu_pickup` pada tabel `pengiriman`.
    3.  Memasukkan catatan transaksi sukses ke tabel `pembayaran` sebagai bukti rekonsiliasi keuangan.
    4.  Memicu catatan sejarah log awal ke tabel `riwayat_status` dengan keterangan "Pembayaran terkonfirmasi via SmartBank".
Output:
    Objek JSON: `status: 'success'`, `message: 'Status pembayaran dan pengiriman berhasil diperbarui'`.

4.5 IPO Fitur 5: Biaya Layanan Logistik
input:
    Permintaan rekapitulasi data keuangan (pembacaan flag `is_paid = TRUE`).
Proses:
    1.  Sistem melakukan query agregasi database: `SELECT SUM(biaya_layanan) FROM pengiriman WHERE is_paid = TRUE`.
    2.  Menghitung nilai margin operasional kotor dikurangi potongan pajak sistem 5% yang disetorkan ke ekosistem.
Output:
    Objek JSON: `status: 'success'`, data `total_fee` (misal: "Rp 250.000").


