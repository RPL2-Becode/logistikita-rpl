<?php
class Pengiriman {
    private $conn;
    private $table_name = "pengiriman";

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create($data) {
        $resi = 'LKT-' . date('Ymd') . '-' . rand(10000, 99999);
        $user_id = (int)$data['user_id'];
        $pengirim_nama = $this->conn->real_escape_string($data['pengirim_nama'] ?? '');
        $pengirim_telp = $this->conn->real_escape_string($data['pengirim_telp'] ?? '');
        $pengirim_alamat = $this->conn->real_escape_string($data['pengirim_alamat'] ?? '');
        $penerima_nama = $this->conn->real_escape_string($data['penerima_nama']);
        $penerima_telp = $this->conn->real_escape_string($data['penerima_telp']);
        $penerima_alamat = $this->conn->real_escape_string($data['penerima_alamat']);
        $berat = (float)$data['berat'];
        
        $layanan_str = strtolower($data['layanan'] ?? '');
        $layanan_id = null;
        $res = $this->conn->query("SELECT id, nama_layanan FROM layanan");
        if ($res && $res->num_rows > 0) {
            while ($row = $res->fetch_assoc()) {
                if (strpos($layanan_str, strtolower($row['nama_layanan'])) !== false) {
                    $layanan_id = $row['id'];
                    break;
                }
            }
        }
        
        // Fallback if not found
        if (!$layanan_id) {
            $res = $this->conn->query("SELECT id FROM layanan LIMIT 1");
            if ($res && $res->num_rows > 0) {
                $layanan_id = $res->fetch_assoc()['id'];
            } else {
                return ['error' => 'Tabel layanan kosong. Silakan jalankan setup.php kembali.'];
            }
        }

        $asuransi = 0;
        if (isset($data['asuransi']) && $data['asuransi'] == true && isset($data['nilai_barang'])) {
            $asuransi = (float)$data['nilai_barang'] * 0.005;
        }
        $biaya_ongkir = (float)$data['biaya_ongkir'];
        $biaya_layanan = $biaya_ongkir * 0.05;

        $ext_order_id = isset($data['ext_order_id']) && $data['ext_order_id'] !== '' ? (int)$data['ext_order_id'] : 'NULL';
        $ext_user_id = isset($data['ext_user_id']) && $data['ext_user_id'] !== '' ? (int)$data['ext_user_id'] : 'NULL';

        $sql = "INSERT INTO " . $this->table_name . " 
                (user_id, ext_order_id, ext_user_id, resi, pengirim_nama, pengirim_telp, pengirim_alamat, penerima_nama, penerima_telp, penerima_alamat, berat, layanan_id, asuransi, biaya_ongkir, biaya_layanan, status) 
                VALUES ($user_id, $ext_order_id, $ext_user_id, '$resi', '$pengirim_nama', '$pengirim_telp', '$pengirim_alamat', '$penerima_nama', '$penerima_telp', '$penerima_alamat', $berat, $layanan_id, $asuransi, $biaya_ongkir, $biaya_layanan, 'pending')";

        try {
            if ($this->conn->query($sql) === TRUE) {
                $pengiriman_id = $this->conn->insert_id;
                // Record in riwayat_status
                $this->addRiwayat($pengiriman_id, 'pending', 'Sistem', 'Pesanan dibuat');

                return [
                    'pengiriman_id' => $pengiriman_id,
                    'resi' => $resi,
                    'biaya_ongkir' => $biaya_ongkir,
                    'biaya_layanan' => $biaya_layanan,
                    'total_bayar' => $biaya_ongkir + $biaya_layanan + $asuransi,
                    'ext_order_id' => $ext_order_id !== 'NULL' ? $ext_order_id : null,
                    'ext_user_id' => $ext_user_id !== 'NULL' ? $ext_user_id : null,
                    'status' => 'pending'
                ];
            }
            return ['error' => $this->conn->error];
        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function addRiwayat($pengiriman_id, $status, $lokasi, $keterangan) {
        $status = $this->conn->real_escape_string($status);
        $lokasi = $this->conn->real_escape_string($lokasi);
        $keterangan = $this->conn->real_escape_string($keterangan);
        $sql = "INSERT INTO riwayat_status (pengiriman_id, status, lokasi, keterangan) VALUES ($pengiriman_id, '$status', '$lokasi', '$keterangan')";
        $this->conn->query($sql);
    }

    public function addPembukuan($resi, $penerima_nama, $status_barang, $jenis, $kategori, $jumlah, $keterangan) {
        $resi = $this->conn->real_escape_string($resi);
        $penerima_nama = $this->conn->real_escape_string($penerima_nama);
        $status_barang = $this->conn->real_escape_string($status_barang);
        $jenis = $this->conn->real_escape_string($jenis);
        $kategori = $this->conn->real_escape_string($kategori);
        $jumlah = (float)$jumlah;
        $keterangan = $this->conn->real_escape_string($keterangan);

        $sql = "INSERT INTO pembukuan (resi, penerima_nama, status_barang, jenis, kategori, jumlah, keterangan) 
                VALUES ('$resi', '$penerima_nama', '$status_barang', '$jenis', '$kategori', $jumlah, '$keterangan')";
        return $this->conn->query($sql);
    }

    public function updateStatus($resi, $status, $lokasi = '', $keterangan = '') {
        $resi = $this->conn->real_escape_string($resi);
        $status = $this->conn->real_escape_string($status);
        
        $shipmentRes = $this->conn->query("SELECT * FROM " . $this->table_name . " WHERE resi = '$resi'");
        if ($shipmentRes->num_rows === 0) {
            return false;
        }
        $shipment = $shipmentRes->fetch_assoc();
        $id = $shipment['id'];
        $penerima_nama = $shipment['penerima_nama'];
        
        $sql = "UPDATE " . $this->table_name . " SET status = '$status' WHERE resi = '$resi'";
        if ($this->conn->query($sql) === TRUE) {
            $this->addRiwayat($id, $status, $lokasi, $keterangan);
            $this->triggerWebhookCallback($resi, $status, $shipment['ext_order_id'] ?? null);
            
            // Log ke Pembukuan
            $status_barang = 'transit_hub';
            if ($status === 'delivered') {
                $status_barang = 'diterima_konsumen';
            } else if ($status === 'delivery') {
                $status_barang = 'sedang_dikirim';
            } else if ($status === 'batal') {
                $status_barang = 'dibatalkan';
            } else if ($status === 'menunggu_pickup' || $status === 'pending') {
                $status_barang = 'masuk_sistem';
            }
            
            // Catat log perpindahan barang di pembukuan (jumlah = 0 untuk log status)
            $this->addPembukuan($resi, $penerima_nama, $status_barang, 'pemasukan', 'ongkir', 0, "Update status menjadi: " . $status . " di " . ($lokasi ?: 'System') . ". Keterangan: " . $keterangan);

            // Jika status menjadi delivered, bayar komisi kurir!
            if ($status === 'delivered') {
                $komisi = $shipment['biaya_ongkir'] * 0.1;
                // Catat pengeluaran komisi kurir
                $this->addPembukuan($resi, $penerima_nama, 'diterima_konsumen', 'pengeluaran', 'komisi_kurir', $komisi, "Komisi kurir 10% atas resi " . $resi);
                
                // Jika ada tip, cairkan tip juga!
                if ($shipment['tip'] > 0) {
                    $this->addPembukuan($resi, $penerima_nama, 'diterima_konsumen', 'pengeluaran', 'tip_kurir', $shipment['tip'], "Penerusan tip kurir atas resi " . $resi);
                    SmartBank::processTransaction($resi, $komisi + $shipment['tip'], 'courier_payout', 'kurir@logistikita.com');
                } else {
                    SmartBank::processTransaction($resi, $komisi, 'courier_payout', 'kurir@logistikita.com');
                }
            }

            return true;
        }
        return false;
    }

    public function findByResi($resi) {
        $resi = $this->conn->real_escape_string($resi);
        $sql = "SELECT p.*, l.nama_layanan FROM " . $this->table_name . " p 
                LEFT JOIN layanan l ON p.layanan_id = l.id 
                WHERE p.resi = '$resi'";
        $result = $this->conn->query($sql);
        if ($result->num_rows > 0) {
            $data = $result->fetch_assoc();
            
            // Get riwayat
            $riwayat_sql = "SELECT * FROM riwayat_status WHERE pengiriman_id = " . $data['id'] . " ORDER BY waktu_update DESC";
            $r_result = $this->conn->query($riwayat_sql);
            $riwayat = [];
            while($row = $r_result->fetch_assoc()) {
                $riwayat[] = $row;
            }
            $data['riwayat'] = $riwayat;
            return $data;
        }
        return null;
    }

    public function findAllByUser($user_id) {
        $user_id = (int)$user_id;
        $sql = "SELECT p.*, l.nama_layanan FROM " . $this->table_name . " p 
                LEFT JOIN layanan l ON p.layanan_id = l.id 
                WHERE p.user_id = $user_id ORDER BY p.created_at DESC";
        $result = $this->conn->query($sql);
        $data = [];
        if($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        return $data;
    }

    public function findAll() {
        $sql = "SELECT p.*, l.nama_layanan FROM " . $this->table_name . " p 
                LEFT JOIN layanan l ON p.layanan_id = l.id 
                ORDER BY p.created_at DESC";
        $result = $this->conn->query($sql);
        $data = [];
        if($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        return $data;
    }

    public function findAllForKurir() {
        $sql = "SELECT p.*, l.nama_layanan FROM " . $this->table_name . " p 
                LEFT JOIN layanan l ON p.layanan_id = l.id 
                WHERE p.status IN ('menunggu_pickup', 'pickup', 'transit', 'delivery', 'delivered')
                ORDER BY p.created_at DESC";
        $result = $this->conn->query($sql);
        $data = [];
        if($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        return $data;
    }

    public function findById($id) {
        $id = (int)$id;
        $sql = "SELECT * FROM " . $this->table_name . " WHERE id = $id";
        $result = $this->conn->query($sql);
        if ($result->num_rows > 0) {
            return $result->fetch_assoc();
        }
        return null;
    }

    public function updatePaymentStatus($id, $bank_ref, $amount) {
        $id = (int)$id;
        $sql = "UPDATE " . $this->table_name . " SET is_paid = TRUE, status = 'pending' WHERE id = $id";
        if($this->conn->query($sql)) {
            $bank_ref = $this->conn->real_escape_string($bank_ref);
            $this->conn->query("INSERT INTO pembayaran (pengiriman_id, bank_ref, amount, payment_type) VALUES ($id, '$bank_ref', $amount, 'payment_logistik')");
            $this->addRiwayat($id, 'pending', 'Sistem', 'Pembayaran terkonfirmasi (Ref: ' . $bank_ref . '). Menunggu verifikasi Operator.');
            
            $shipment = $this->findById($id);
            if ($shipment) {
                // Pemasukan ongkir
                $this->addPembukuan($shipment['resi'], $shipment['penerima_nama'], 'masuk_sistem', 'pemasukan', 'ongkir', $amount, 'Pemasukan ongkos kirim (Ref: ' . $bank_ref . ')');
                
                // Pengeluaran pajak layanan 5% disetorkan ke SmartBank
                $feeLayanan = $shipment['biaya_layanan'];
                $this->addPembukuan($shipment['resi'], $shipment['penerima_nama'], 'masuk_sistem', 'pengeluaran', 'pajak_layanan', $feeLayanan, 'Setoran pajak layanan 5% ke ekosistem');
                
                SmartBank::processTransaction($shipment['resi'], $feeLayanan, 'tax_disbursement', 'admin@logistikita.com');
            }
            return true;
        }
        return false;
    }

    public function cancelShipment($resi, $user_email) {
        $resi = $this->conn->real_escape_string($resi);
        $shipmentRes = $this->conn->query("SELECT * FROM " . $this->table_name . " WHERE resi = '$resi'");
        if ($shipmentRes->num_rows === 0) {
            return ['status' => 'error', 'message' => 'Pesanan tidak ditemukan.'];
        }
        $shipment = $shipmentRes->fetch_assoc();
        
        if ($shipment['status'] !== 'pending' && $shipment['status'] !== 'menunggu_pickup') {
            return ['status' => 'error', 'message' => 'Pesanan tidak dapat dibatalkan karena sudah dalam perjalanan atau terkirim.'];
        }

        $sql = "UPDATE " . $this->table_name . " SET status = 'batal' WHERE id = " . $shipment['id'];
        if ($this->conn->query($sql)) {
            $this->addRiwayat($shipment['id'], 'batal', 'Sistem', 'Pesanan dibatalkan oleh pengguna.');
            $this->addPembukuan($resi, $shipment['penerima_nama'], 'dibatalkan', 'pemasukan', 'ongkir', 0, 'Pesanan dibatalkan oleh pengguna');

            if ($shipment['is_paid']) {
                $total_bayar = $shipment['biaya_ongkir'] + $shipment['biaya_layanan'] + $shipment['asuransi'];
                $refundRes = SmartBank::processRefund($resi, $total_bayar, $user_email);
                
                if ($refundRes['status'] === 'success') {
                    $this->addPembukuan($resi, $shipment['penerima_nama'], 'dibatalkan', 'pengeluaran', 'refund', $total_bayar, 'Refund dana pengiriman (Ref: ' . $refundRes['bank_ref'] . ')');
                    return ['status' => 'success', 'message' => 'Pesanan dibatalkan dan dana Anda berhasil direfund.', 'refund_amount' => $total_bayar];
                } else {
                    return ['status' => 'warning', 'message' => 'Pesanan dibatalkan, namun refund SmartBank gagal: ' . $refundRes['message']];
                }
            }
            return ['status' => 'success', 'message' => 'Pesanan berhasil dibatalkan.'];
        }
        return ['status' => 'error', 'message' => 'Gagal mengubah status di database.'];
    }

    public function addTip($resi, $tip_amount, $user_email) {
        $resi = $this->conn->real_escape_string($resi);
        $tip_amount = (float)$tip_amount;
        
        $shipmentRes = $this->conn->query("SELECT * FROM " . $this->table_name . " WHERE resi = '$resi'");
        if ($shipmentRes->num_rows === 0) {
            return ['status' => 'error', 'message' => 'Pesanan tidak ditemukan.'];
        }
        $shipment = $shipmentRes->fetch_assoc();

        $payRes = SmartBank::processTransaction($resi, $tip_amount, 'courier_tip', $user_email);
        if ($payRes['status'] !== 'success') {
            return ['status' => 'error', 'message' => 'Gagal melakukan pembayaran tip via SmartBank: ' . $payRes['message']];
        }

        $sql = "UPDATE " . $this->table_name . " SET tip = tip + $tip_amount WHERE id = " . $shipment['id'];
        if ($this->conn->query($sql)) {
            $this->addPembukuan($resi, $shipment['penerima_nama'], $shipment['status'] === 'delivered' ? 'diterima_konsumen' : 'transit_hub', 'pemasukan', 'tip_kurir', $tip_amount, 'Pemasukan tip kurir dari pelanggan');

            if ($shipment['status'] === 'delivered') {
                $this->addPembukuan($resi, $shipment['penerima_nama'], 'diterima_konsumen', 'pengeluaran', 'tip_kurir', $tip_amount, 'Penerusan tip ke kurir');
                SmartBank::processTransaction($resi, $tip_amount, 'courier_tip_payout', 'kurir@logistikita.com');
            }
            
            return ['status' => 'success', 'message' => 'Terima kasih! Tip sebesar Rp ' . number_format($tip_amount, 0, ',', '.') . ' berhasil dikirim ke kurir.'];
        }
        return ['status' => 'error', 'message' => 'Gagal mengupdate tip di database.'];
    }

    public function getPembukuanList() {
        $sql = "SELECT * FROM pembukuan ORDER BY created_at DESC";
        $result = $this->conn->query($sql);
        $data = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        return $data;
    }
    
    public function getTotalFeeLayanan() {
        $sql = "SELECT SUM(biaya_layanan) as total_fee FROM " . $this->table_name . " WHERE is_paid = TRUE";
        $result = $this->conn->query($sql);
        $data = $result->fetch_assoc();
        return $data['total_fee'] ?? 0;
    }

    public function getSystemLogs() {
        $sql = "SELECT r.status, r.lokasi, r.waktu_update as timestamp, p.resi FROM riwayat_status r JOIN pengiriman p ON r.pengiriman_id = p.id ORDER BY r.waktu_update DESC LIMIT 20";
        $result = $this->conn->query($sql);
        $logs = [];
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $logs[] = $row;
            }
        }
        return $logs;
    }

    public function triggerWebhookCallback($resi, $status, $ext_order_id) {
        if (!$ext_order_id) return;
        
        $payload = [
            'app' => 'LogistiKita',
            'resi' => $resi,
            'ext_order_id' => $ext_order_id,
            'status' => $status,
            'waktu_update' => date('Y-m-d H:i:s')
        ];

        // Rute Gateway Callback (menampung slot untuk integrasi luar)
        $gatewayUrl = 'http://localhost/gateway/index.php?request=api/callback';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $gatewayUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2); // Timeout cepat agar tidak memblokir thread

        $response = curl_exec($ch);
        curl_close($ch);
    }
}
?>
