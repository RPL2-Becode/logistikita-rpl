// State & Session Validation
let loggedInUser = null;
let scanCount = 0;
let qrScanner = null;

function checkAuth() {
    const userSession = localStorage.getItem('user');
    if (!userSession) {
        window.location.href = 'auth';
        return;
    }
    
    try {
        loggedInUser = JSON.parse(userSession);
        if (loggedInUser.role !== 'operator' && loggedInUser.role !== 'admin') {
            window.location.href = 'auth';
            return;
        }
        
        // Render UI Profile
        const nameEl = document.getElementById('operator-name');
        if (nameEl) nameEl.innerText = loggedInUser.name;
        const avatarEl = document.getElementById('nav-avatar');
        if (avatarEl) avatarEl.innerText = loggedInUser.name.substring(0, 2).toUpperCase();
        
        // Auto-select Hub based on operator name (optional convenience)
        const hubSelect = document.getElementById('operatorHubSelect');
        if (hubSelect) {
            if (loggedInUser.name.toLowerCase().includes('surabaya') || loggedInUser.name.toLowerCase().includes('sby')) {
                hubSelect.value = 'Hub Surabaya (Cabang 2)';
            } else if (loggedInUser.name.toLowerCase().includes('bandung') || loggedInUser.name.toLowerCase().includes('bdg')) {
                hubSelect.value = 'Hub Bandung (Cabang 3)';
            } else {
                hubSelect.value = 'Hub Jakarta (Cabang 1)';
            }
        }
    } catch (e) {
        window.location.href = 'auth';
    }
}

// Update display information or auto-focus
function updateLocationDisplay() {
    document.getElementById('resiInput').focus();
}

// Toggle Camera Scanner using html5-qrcode library
function toggleCameraScanner() {
    const readerDiv = document.getElementById('camera-reader');
    if (!readerDiv) return;

    if (readerDiv.style.display === 'block') {
        if (qrScanner) {
            qrScanner.clear().then(() => {
                readerDiv.style.display = 'none';
            }).catch(err => console.error("Error clearing scanner:", err));
        } else {
            readerDiv.style.display = 'none';
        }
    } else {
        readerDiv.style.display = 'block';
        if (!qrScanner) {
            qrScanner = new Html5QrcodeScanner(
                "camera-reader",
                { 
                    fps: 10, 
                    qrbox: { width: 300, height: 150 },
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] 
                },
                false
            );
        }
        qrScanner.render(onScanSuccess, onScanFailure);
    }
}

function onScanSuccess(decodedText) {
    const resiInput = document.getElementById('resiInput');
    if (resiInput) {
        resiInput.value = decodedText;
        
        // Beep Sound Effect
        try {
            const beep = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3');
            beep.play();
        } catch(e) {}
        
        // Close scanner
        toggleCameraScanner();
        
        // Process update
        handleHubUpdate();
    }
}

function onScanFailure(error) {
    // Failures happen frame-by-frame, ignore to avoid spamming console
}

// Process update request to database
function handleHubUpdate() {
    const resiInput = document.getElementById('resiInput');
    const hubSelect = document.getElementById('operatorHubSelect');
    const actionSelect = document.getElementById('statusActionSelect');
    const historyList = document.getElementById('sessionLogsList');
    const emptyState = document.getElementById('emptyLogState');
    const countBadge = document.getElementById('scanCountBadge');

    const resi = resiInput.value.trim().toUpperCase();
    const hub = hubSelect.value;
    const action = actionSelect.value;

    if (!resi) {
        Swal.fire({
            icon: 'warning',
            title: 'Resi Kosong',
            text: 'Harap pindai atau masukkan nomor resi terlebih dahulu!',
            confirmButtonColor: '#f43f5e'
        });
        return;
    }

    // Determine keterangan based on action
    let keterangan = '';
    if (action === 'masuk') {
        keterangan = `Barang sudah diterima hub ${hub}`;
    } else {
        keterangan = `Barang keluar dari hub ${hub}`;
    }

    const payload = {
        resi: resi,
        status: 'transit',
        lokasi: hub,
        keterangan: keterangan
    };

    Swal.fire({
        title: 'Memproses...',
        text: 'Memperbarui status resi ' + resi,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    fetch('http://localhost/logistikita/index.php?request=api/logistikita/tracking_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        Swal.close();
        if (data.status === 'success') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: `Resi ${resi} Berhasil Diperbarui!`,
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });

            // Play success audio
            try {
                const successAudio = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3');
                successAudio.play();
            } catch(e) {}

            // Prepend log to list
            if (emptyState) emptyState.style.display = 'none';

            const now = new Date();
            const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                            String(now.getMinutes()).padStart(2, '0') + ':' + 
                            String(now.getSeconds()).padStart(2, '0');

            const li = document.createElement('li');
            li.className = 'scan-log-item';
            li.innerHTML = `
                <div>
                    <div style="font-weight: 800; color: white; font-size: 1.1rem; margin-bottom: 4px;">${resi}</div>
                    <div style="font-size: 0.85rem; color: #94a3b8;">
                        <span style="color: #10b981; font-weight: 700;">${action === 'masuk' ? 'Diterima' : 'Keluar'}</span> &bull; ${hub}
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">
                    <i class="far fa-clock"></i> ${timeStr}
                </div>
            `;
            
            if (historyList) {
                historyList.insertBefore(li, historyList.firstChild);
            }

            // Update Counter
            scanCount++;
            if (countBadge) countBadge.innerText = `${scanCount} Paket`;

            // Reset inputs & refocuse
            resiInput.value = '';
            resiInput.focus();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Update',
                text: data.message,
                confirmButtonColor: '#f43f5e'
            });
        }
    })
    .catch(err => {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Kesalahan Jaringan',
            text: 'Gagal terhubung ke server backend.',
            confirmButtonColor: '#f43f5e'
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateLocationDisplay();
});
