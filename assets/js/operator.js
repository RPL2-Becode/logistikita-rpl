// Global fetch interceptor to auto-inject Bearer Token for JWT Authentication
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        if (typeof input === 'string' && input.includes('index.php?request=api/')) {
            const userSession = localStorage.getItem('user');
            let token = '';
            if (userSession) {
                try { token = JSON.parse(userSession).token; } catch(e) {}
            }
            if (token) {
                init = init || {};
                init.headers = init.headers || {};
                if (init.headers instanceof Headers) {
                    init.headers.set('Authorization', 'Bearer ' + token);
                } else {
                    if (!init.headers['Authorization'] && !init.headers['authorization']) {
                        init.headers['Authorization'] = 'Bearer ' + token;
                    }
                }
            }
        }
        return originalFetch(input, init);
    };
})();

// State & Session Validation
let loggedInUser = null;
let scanCount = 0;
let qrScanner = null;

function saveScanLog(resi, action, hub, timeStr) {
    if (!loggedInUser) return;
    const key = 'operator_scan_history_' + loggedInUser.id;
    let history = [];
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch(e) {}
    
    history.unshift({ resi, action, hub, timeStr });
    localStorage.setItem(key, JSON.stringify(history));
}

function loadScanLogsFromStorage() {
    if (!loggedInUser) return;
    const key = 'operator_scan_history_' + loggedInUser.id;
    const historyList = document.getElementById('sessionLogsList');
    const emptyState = document.getElementById('emptyLogState');
    const countBadge = document.getElementById('scanCountBadge');
    
    if (!historyList) return;
    
    let history = [];
    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            history = JSON.parse(stored);
        }
    } catch(e) {}
    
    if (history.length > 0) {
        if (emptyState) emptyState.style.display = 'none';
        historyList.innerHTML = '';
        history.forEach(log => {
            const li = document.createElement('li');
            li.className = 'scan-log-item';
            li.innerHTML = `
                <div>
                    <div style="font-weight: 800; color: white; font-size: 1.1rem; margin-bottom: 4px;">${log.resi}</div>
                    <div style="font-size: 0.85rem; color: #94a3b8;">
                        <span style="color: #10b981; font-weight: 700;">${log.action === 'masuk' ? 'Diterima' : 'Keluar'}</span> &bull; ${log.hub}
                    </div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; font-weight: 600;">
                    <i class="far fa-clock"></i> ${log.timeStr}
                </div>
            `;
            historyList.appendChild(li);
        });
        scanCount = history.length;
        if (countBadge) countBadge.innerText = `${scanCount} Paket`;
    }
}

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
        
        // Auto-select Hub based on operator name or localStorage
        let initialHub = localStorage.getItem('operator_selected_hub');
        if (!initialHub) {
            initialHub = 'Hub Jakarta (Cabang 1)';
            if (loggedInUser.name.toLowerCase().includes('surabaya') || loggedInUser.name.toLowerCase().includes('sby')) {
                initialHub = 'Hub Surabaya (Cabang 2)';
            } else if (loggedInUser.name.toLowerCase().includes('bandung') || loggedInUser.name.toLowerCase().includes('bdg')) {
                initialHub = 'Hub Bandung (Cabang 3)';
            }
        }
        syncHubSelectors(initialHub);
    } catch (e) {
        window.location.href = 'auth';
    }
}

// Update display information or auto-focus
function updateLocationDisplay() {
    const resiInput = document.getElementById('resiInput');
    if (resiInput) resiInput.focus();
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

    fetch('index.php?request=api/logistikita/tracking_status', {
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

            saveScanLog(resi, action, hub, timeStr);

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

            // Reset inputs & refocus
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

// Switch view panels
function switchOperatorView(viewId, element) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(item => item.classList.remove('active'));

    if (element) element.classList.add('active');

    // Fetch data if switching to approval
    if (viewId === 'operator-approval-view') {
        loadPendingShipments();
    }
}

// Synchronize Hub Selectors
function syncHubSelectors(value) {
    const approvalSelect = document.getElementById('operatorHubSelectApproval');
    const scanSelect = document.getElementById('operatorHubSelect');
    if (approvalSelect) approvalSelect.value = value;
    if (scanSelect) scanSelect.value = value;
    localStorage.setItem('operator_selected_hub', value);
}

// Load Pending Shipments
function loadPendingShipments() {
    const tbody = document.getElementById('pendingShipmentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 32px; color: #64748b;">
                <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Memuat antrean pending...
            </td>
        </tr>
    `;

    fetch('index.php?request=api/logistikita/daftar_pengiriman&type=all')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const shipments = data.data;
                const pending = shipments.filter(item => item.status === 'pending');
                tbody.innerHTML = '';

                if (pending.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 48px; color: #64748b;">
                                <i class="fas fa-box-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color: #334155;"></i>
                                Tidak ada paket pending yang memerlukan verifikasi.
                            </td>
                        </tr>
                    `;
                    return;
                }

                pending.forEach(item => {
                    const dateObj = new Date(item.created_at || Date.now());
                    const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('id-ID', { month: 'short' })} ${dateObj.getFullYear()}`;
                    
                    const paymentBadge = item.is_paid == 1 
                        ? '<span class="status-pill status-success" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 20px; font-weight:700;">Terbayar</span>' 
                        : '<span class="status-pill status-danger" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 20px; font-weight:700;">Belum Bayar</span>';

                    const actionBtn = item.is_paid == 1
                        ? `<button onclick="approveShipment('${item.resi}')" class="btn-update" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 8px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); font-weight: 800;">ACC / Terima</button>`
                        : `<button class="btn-update" style="padding: 8px 16px; font-size: 0.85rem; border-radius: 8px; background: #475569; color: #94a3b8; cursor: not-allowed; box-shadow: none;" disabled>Menunggu Pembayaran</button>`;

                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                            <td style="padding: 16px;">
                                <div style="font-weight: 800; color: white; font-size: 1.1rem; margin-bottom: 4px;">${item.resi}</div>
                                <div style="font-size: 0.8rem; color: #94a3b8;"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                            </td>
                            <td style="padding: 16px;">
                                <div style="font-weight: 800; color: #60a5fa; font-size: 0.95rem; margin-bottom: 4px;">${item.nama_layanan || 'Reguler'}</div>
                                <div style="font-size: 0.85rem; color: #cbd5e1; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.penerima_alamat}"><i class="fas fa-map-marker-alt" style="color: #f43f5e;"></i> ${item.penerima_alamat}</div>
                            </td>
                            <td style="padding: 16px;">
                                <div style="font-weight: 700; color: #f8fafc;">${item.pengirim_nama || 'User'}</div>
                                <div style="font-size: 0.85rem; color: #94a3b8;"><i class="fas fa-phone"></i> ${item.pengirim_telp || '-'}</div>
                            </td>
                            <td style="padding: 16px;">
                                <div style="font-weight: 700; color: #f8fafc;">${item.penerima_nama}</div>
                                <div style="font-size: 0.85rem; color: #94a3b8;"><i class="fas fa-phone"></i> ${item.penerima_telp}</div>
                            </td>
                            <td style="padding: 16px; text-align: center; vertical-align: middle;">
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                    ${paymentBadge}
                                    ${actionBtn}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: #f43f5e;">Gagal memuat: ${data.message}</td></tr>`;
            }
        })
        .catch(err => {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: #f43f5e;">Gagal terhubung ke server.</td></tr>';
        });
}

// Approve Shipment
function approveShipment(resi) {
    const hubSelect = document.getElementById('operatorHubSelectApproval');
    const hub = hubSelect ? hubSelect.value : 'Hub Jakarta (Cabang 1)';

    Swal.fire({
        title: 'Verifikasi Paket',
        text: `ACC dan terima paket resi ${resi} di ${hub}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, ACC!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Memproses...',
                text: 'Memperbarui status pengiriman...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const payload = {
                resi: resi,
                status: 'menunggu_pickup',
                lokasi: hub,
                keterangan: `Paket diterima dan diverifikasi oleh Operator di ${hub}`
            };

            fetch('index.php?request=api/logistikita/tracking_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                Swal.close();
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil di-ACC',
                        text: `Resi ${resi} disetujui. Siap di-pickup kurir!`,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    loadPendingShipments();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: data.message
                    });
                }
            })
            .catch(err => {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan',
                    text: 'Gagal terhubung ke server.'
                });
            });
        }
    });
}

function logoutOperator() {
    localStorage.removeItem('user');
    window.location.href = 'auth';
}

// Exposed to window scope
window.switchOperatorView = switchOperatorView;
window.syncHubSelectors = syncHubSelectors;
window.approveShipment = approveShipment;
window.loadPendingShipments = loadPendingShipments;
window.toggleCameraScanner = toggleCameraScanner;
window.handleHubUpdate = handleHubUpdate;
window.logoutOperator = logoutOperator;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadScanLogsFromStorage();
    updateLocationDisplay();
    loadPendingShipments();
});
