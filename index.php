<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Autoloader sederhana atau manual require
require_once 'app/Config/Database.php';
require_once 'app/Models/User.php';
require_once 'app/Models/Pengiriman.php';
require_once 'app/Models/SmartBank.php';
require_once 'app/Controllers/BaseController.php';
require_once 'app/Controllers/AuthController.php';
require_once 'app/Controllers/LogistikitaController.php';

$request = isset($_GET['request']) ? $_GET['request'] : '';
$request = rtrim($request, '/');

// === 1. API ROUTING ===
if (strpos($request, 'api/') === 0) {
    header("Content-Type: application/json; charset=UTF-8");
    $apiRequest = substr($request, 4); // Hilangkan awalan 'api/'
    
    $db = new Database();
    $connection = $db->getConnection();
    
    // Helper function for JWT validation
    function verifyJWT() {
        $authHeader = '';
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        }
        if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (empty($authHeader)) {
            return ['valid' => false, 'error' => 'Otorisasi token diperlukan (Authorization header kosong).'];
        }
        if (strpos($authHeader, 'Bearer ') !== 0) {
            return ['valid' => false, 'error' => 'Format token tidak valid (Harus Bearer <token>).'];
        }
        
        $token = substr($authHeader, 7);
        $decoded = base64_decode($token, true);
        if (!$decoded) {
            return ['valid' => false, 'error' => 'Token tidak valid (Bukan format base64).'];
        }
        
        $payload = json_decode($decoded, true);
        if (!$payload || !isset($payload['id']) || !isset($payload['role'])) {
            return ['valid' => false, 'error' => 'Token kadaluarsa atau tidak valid.'];
        }
        return ['valid' => true, 'user' => $payload];
    }

    // Helper function for Logging API
    function logApiRequest($conn, $endpoint, $user_app, $status, $payload, $error = null) {
        $endpoint = $conn->real_escape_string($endpoint);
        $user_app = $conn->real_escape_string($user_app);
        $status = $conn->real_escape_string($status);
        $payload = $conn->real_escape_string($payload);
        $error = $error ? "'" . $conn->real_escape_string($error) . "'" : "NULL";
        
        $sql = "INSERT INTO api_logs (endpoint, user_app, status, payload, error) 
                VALUES ('$endpoint', '$user_app', '$status', '$payload', $error)";
        $conn->query($sql);
    }

    // List of endpoints that require JWT validation
    $secureEndpoints = [
        'logistikita/request_pengiriman',
        'logistikita/pembayaran_logistik',
        'logistikita/biaya_layanan_logistik',
        'logistikita/system_logs',
        'logistikita/batalkan_pengiriman',
        'logistikita/beri_tip',
        'logistikita/pembukuan_perusahaan',
        'smartbank/saldo'
    ];

    $isSecure = in_array($apiRequest, $secureEndpoints);
    
    // Custom check for tracking_status POST (GET is public)
    if ($apiRequest === 'logistikita/tracking_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $isSecure = true;
    }
    // Custom check for daftar_pengiriman
    if ($apiRequest === 'logistikita/daftar_pengiriman') {
        $isSecure = true;
    }

    $currentUser = null;
    if ($isSecure) {
        $authResult = verifyJWT();
        if (!$authResult['valid']) {
            http_response_code(401);
            $errMessage = $authResult['error'];
            logApiRequest($connection, $apiRequest, 'Guest/External', 'error', file_get_contents("php://input"), $errMessage);
            echo json_encode(["status" => "error", "message" => $errMessage]);
            exit();
        }
        $currentUser = $authResult['user'];
    }

    // Capture response for logging
    ob_start();

    $authController = new AuthController($connection);
    $logistikitaController = new LogistikitaController($connection);

    switch ($apiRequest) {
        case 'auth/login':
            $authController->login();
            break;
        case 'auth/register':
            $authController->register();
            break;
        case 'auth/users':
            $authController->getUsers();
            break;
        case 'logistikita/request_pengiriman':
            $logistikitaController->requestPengiriman();
            break;
        case 'logistikita/tracking_status':
            $logistikitaController->trackingStatus();
            break;
        case 'logistikita/biaya_pengiriman':
            $logistikitaController->biayaPengiriman();
            break;
        case 'logistikita/pembayaran_logistik':
            $logistikitaController->pembayaranLogistik();
            break;
        case 'logistikita/biaya_layanan_logistik':
            $logistikitaController->biayaLayananLogistik();
            break;
        case 'logistikita/daftar_pengiriman':
            $logistikitaController->daftarPengiriman();
            break;
        case 'logistikita/system_logs':
            $logistikitaController->getSystemLogs();
            break;
        case 'logistikita/batalkan_pengiriman':
            $logistikitaController->batalkanPengiriman();
            break;
        case 'logistikita/beri_tip':
            $logistikitaController->beriTip();
            break;
        case 'logistikita/pembukuan_perusahaan':
            $logistikitaController->getPembukuan();
            break;
        case 'smartbank/saldo':
            $logistikitaController->getSmartBankBalance();
            break;
        default:
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "API Endpoint not found: " . $apiRequest]);
            break;
    }

    $responseOutput = ob_get_clean();
    echo $responseOutput;
    
    // Log request to database
    $userAppStr = $currentUser ? ($currentUser['role'] . ' (ID: ' . $currentUser['id'] . ')') : 'Public/Guest';
    $payloadData = file_get_contents("php://input");
    if (empty($payloadData)) {
        $payloadData = json_encode($_GET);
    }
    
    $responseJSON = json_decode($responseOutput, true);
    $statusStr = (isset($responseJSON['status']) && $responseJSON['status'] === 'success') ? 'success' : 'error';
    $errorStr = (isset($responseJSON['message']) && $statusStr === 'error') ? $responseJSON['message'] : null;
    
    logApiRequest($connection, $apiRequest, $userAppStr, $statusStr, $payloadData, $errorStr);
    exit();
}

// === 2. VIEWS ROUTING (FRONTEND) ===
switch ($request) {
    case '':
    case 'home':
        include 'app/Views/index.html';
        break;
    case 'auth':
    case 'login':
        include 'app/Views/login.html';
        break;
    case 'register':
        include 'app/Views/register.html';
        break;
    case 'dashboard':
        include 'app/Views/dashboard.html';
        break;
    case 'admin':
        include 'app/Views/admin.html';
        break;
    case 'kurir':
        include 'app/Views/kurir.html';
        break;
    case 'operator':
        include 'app/Views/operator.html';
        break;
    case 'profile':
        include 'app/Views/profile.html';
        break;
    default:
        http_response_code(404);
        echo "404 Page Not Found";
        break;
}
?>
