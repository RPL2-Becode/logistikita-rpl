<?php
class SmartBank {
    // URL endpoint API SmartBank dialirkan melalui API Gateway
    private static $baseUrl = 'http://localhost/gateway/index.php?request=api/smartbank/';

    /**
     * Mengambil saldo user dari API SmartBank
     */
    public static function getBalance($email) {
        $url = self::$baseUrl . 'smartbank/balance&email=' . urlencode($email);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3); // Timeout cepat
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);

        if ($response && $httpCode === 200) {
            $data = json_decode($response, true);
            if (isset($data['status']) && $data['status'] === 'success') {
                return [
                    'status' => 'success',
                    'balance' => $data['data']['balance'] ?? 0.00,
                    'mode' => 'realtime'
                ];
            }
        }

        // Fallback Simulasi jika API SmartBank Kelompok 1 tidak berjalan/offline
        // Simulasi saldo awal 1.000.000 untuk pengujian
        // Gunakan session/cookie ringan atau database LogistiKita untuk menyimpan state saldo simulasi
        if (!isset($_SESSION)) {
            session_start();
        }
        
        $sessionKey = 'simulated_balance_' . md5($email);
        if (!isset($_SESSION[$sessionKey])) {
            $_SESSION[$sessionKey] = ($email === 'admin@logistikita.com') ? 5000000.00 : 1000000.00;
        }

        return [
            'status' => 'success',
            'balance' => $_SESSION[$sessionKey],
            'mode' => 'simulated'
        ];
    }

    /**
     * Mengirimkan request pembayaran/pemotongan saldo ke API SmartBank
     */
    public static function processTransaction($transaksi_id, $amount, $type = 'payment', $email = 'user@logistikita.com') {
        $url = self::$baseUrl . 'smartbank/payment';
        
        $payload = [
            'from_app' => 'LogistiKita',
            'from_user' => $email,
            'to_user' => 'LogistiKita_HQ',
            'amount' => $amount,
            'type' => $type,
            'metadata' => [
                'transaksi_id' => $transaksi_id,
                'description' => 'Pembayaran Logistik ' . $type
            ]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);

        if ($response && $httpCode === 200) {
            $data = json_decode($response, true);
            if (isset($data['status']) && $data['status'] === 'success') {
                return [
                    'status' => 'success',
                    'bank_ref' => $data['data']['bank_ref'] ?? ('SB-' . time() . '-' . rand(1000, 9999)),
                    'amount' => $amount,
                    'mode' => 'realtime'
                ];
            }
        }

        // Fallback Simulasi jika API SmartBank Kelompok 1 tidak berjalan/offline
        if (!isset($_SESSION)) {
            session_start();
        }
        
        $sessionKey = 'simulated_balance_' . md5($email);
        $currentBalance = $_SESSION[$sessionKey] ?? 1000000.00;
        
        if ($currentBalance >= $amount) {
            $_SESSION[$sessionKey] = $currentBalance - $amount;
            
            // Tambahkan ke saldo LogistiKita jika pemasukan
            $hqKey = 'simulated_balance_' . md5('admin@logistikita.com');
            $_SESSION[$hqKey] = ($_SESSION[$hqKey] ?? 5000000.00) + $amount;

            return [
                'status' => 'success',
                'bank_ref' => 'SB-SIM-' . time() . '-' . rand(1000, 9999),
                'amount' => $amount,
                'mode' => 'simulated'
            ];
        } else {
            return [
                'status' => 'error',
                'message' => 'Saldo SmartBank tidak mencukupi.',
                'mode' => 'simulated'
            ];
        }
    }

    /**
     * Mengembalikan uang (Refund) ke user jika terjadi pembatalan
     */
    public static function processRefund($transaksi_id, $amount, $email = 'user@logistikita.com') {
        $url = self::$baseUrl . 'smartbank/refund';
        
        $payload = [
            'from_app' => 'LogistiKita',
            'to_user' => $email,
            'from_user' => 'LogistiKita_HQ',
            'amount' => $amount,
            'type' => 'refund',
            'metadata' => [
                'transaksi_id' => $transaksi_id,
                'description' => 'Refund Logistik ' . $transaksi_id
            ]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, curl_getinfo($ch, CURLINFO_HTTP_CODE));
        curl_close($ch);

        if ($response && $httpCode === 200) {
            $data = json_decode($response, true);
            if (isset($data['status']) && $data['status'] === 'success') {
                return [
                    'status' => 'success',
                    'bank_ref' => $data['data']['bank_ref'] ?? ('SB-REF-' . time() . '-' . rand(1000, 9999)),
                    'amount' => $amount,
                    'mode' => 'realtime'
                ];
            }
        }

        // Fallback Simulasi refund
        if (!isset($_SESSION)) {
            session_start();
        }
        
        $sessionKey = 'simulated_balance_' . md5($email);
        $_SESSION[$sessionKey] = ($_SESSION[$sessionKey] ?? 1000000.00) + $amount;
        
        $hqKey = 'simulated_balance_' . md5('admin@logistikita.com');
        $_SESSION[$hqKey] = ($_SESSION[$hqKey] ?? 5000000.00) - $amount;

        return [
            'status' => 'success',
            'bank_ref' => 'SB-REF-SIM-' . time() . '-' . rand(1000, 9999),
            'amount' => $amount,
            'mode' => 'simulated'
        ];
    }
}
?>
