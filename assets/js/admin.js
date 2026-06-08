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

// State Machine
let currentRole = 'admin';

// Element Grabbers
const btnAdmin = document.getElementById('btnAdminSide');
const btnFinance = document.getElementById('btnFinanceSide');
const menuContent = document.getElementById('sidebar-menu-content');
const roleLabel = document.getElementById('currentRoleLabel');

const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const accountOverlay = document.getElementById('accountOverlay');

// Nav Links Data
const adminLinks = `
    <div class="sidebar-item active" data-target="admin-view"><i class="fas fa-chart-line"></i> Dashboard</div>
    <div class="sidebar-item" data-target="shipments-view"><i class="fas fa-box"></i> Pengiriman</div>
    <div class="sidebar-item" data-target="fleet-view"><i class="fas fa-truck"></i> Armada</div>
    <div class="sidebar-item" data-target="couriers-view"><i class="fas fa-id-card"></i> Kurir</div>
    <div class="sidebar-item" data-target="accounts-view"><i class="fas fa-user-shield"></i> Manajemen Akun</div>
    <div class="sidebar-item" data-target="customers-view"><i class="fas fa-users"></i> Pelanggan</div>
    <div class="sidebar-item" data-target="reports-view"><i class="fas fa-file-invoice"></i> Laporan</div>
`;

const financeLinks = `
    <div class="sidebar-item finance-active active" data-target="finance-view"><i class="fas fa-chart-line"></i> Dashboard Keuangan</div>
    <div class="sidebar-item finance-active" data-target="settlement-view"><i class="fas fa-file-invoice-dollar"></i> Settlement</div>
    <div class="sidebar-item finance-active" data-target="api-view"><i class="fas fa-server"></i> API Gateway</div>
`;

// Universal Navigation Function
function navToView(targetId) {
    // Hide all sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(s => s.classList.remove('active'));

    // Show target section
    const target = document.getElementById(targetId);
    if (target) {
        setTimeout(() => target.classList.add('active'), 50);
    }

    // Update Sidebar Active State
    const items = document.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Special: Init charts when view is shown
    if (targetId === 'finance-view') {
        setTimeout(initFinanceChart, 100);
    }

    if (window.innerWidth <= 1024) closeSidebar();
}

// Switch Role Logic
function switchToAdmin() {
    if (currentRole === 'admin') return;
    currentRole = 'admin';

    if (btnAdmin) btnAdmin.classList.add('active');
    if (btnFinance) btnFinance.classList.remove('active');
    if (roleLabel) roleLabel.innerText = 'System Admin';

    if (menuContent) menuContent.innerHTML = adminLinks;
    navToView('admin-view');
}

function switchToFinance() {
    if (currentRole === 'finance') return;
    currentRole = 'finance';

    if (btnFinance) btnFinance.classList.add('active');
    if (btnAdmin) btnAdmin.classList.remove('active');
    if (roleLabel) roleLabel.innerText = 'Finance Manager';

    if (menuContent) menuContent.innerHTML = financeLinks;
    navToView('finance-view');
}

function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
}

function closeSidebar() {
    if (sidebar) sidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}

function toggleAccountOverlay(name = '') {
    if (accountOverlay) accountOverlay.classList.toggle('active');
    if (name) {
        const title = document.getElementById('overlayTitle');
        if (title) title.innerText = 'Edit Akun Pengguna';
        const userInp = document.getElementById('userName');
        if (userInp) userInp.value = name;
    } else {
        const title = document.getElementById('overlayTitle');
        if (title) title.innerText = 'Tambah Kurir';
        const userInp = document.getElementById('userName');
        if (userInp) userInp.value = '';
        const emailInp = document.getElementById('userEmail');
        if (emailInp) emailInp.value = '';
        const passInp = document.getElementById('userPassword');
        if (passInp) passInp.value = '';
    }
}

function saveUser() {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;

    if (!name || !email || !password) {
        Swal.fire('Error', 'Semua kolom wajib diisi!', 'error');
        return;
    }

    fetch('index.php?request=api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            Swal.fire({
                icon: 'success',
                title: 'Akun Disimpan',
                text: 'Akun kurir berhasil dibuat.',
                confirmButtonColor: 'var(--brand-primary)'
            });
            toggleAccountOverlay();
            loadUsers(); // Refresh table
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    })
    .catch(err => Swal.fire('Error', 'Gagal terhubung ke server', 'error'));
}

function loadUsers() {
    fetch('index.php?request=api/auth/users')
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const tbody = document.getElementById('accounts-table-body');
            const cbody = document.getElementById('couriers-table-body');
            if (tbody) tbody.innerHTML = '';
            if (cbody) cbody.innerHTML = '';
            
            let kurirCount = 0;
            data.data.forEach(user => {
                // For Accounts View
                if (tbody) {
                    let roleBadge = user.role === 'admin' ? '<span class="status-pill" style="background:#ef4444; color:white;">Admin</span>' : 
                                   user.role === 'kurir' ? '<span class="status-pill status-processing">Kurir</span>' : 
                                   '<span class="status-pill status-pending">User</span>';
                    
                    tbody.innerHTML += `
                        <tr>
                            <td><span class="text-bold">UID-${user.id}</span></td>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${roleBadge}</td>
                            <td><span class="status-pill status-success">Aktif</span></td>
                            <td style="text-align: right;"><button class="btn-ghost">Edit</button></td>
                        </tr>
                    `;
                }

                // For Couriers View
                if (user.role === 'kurir') {
                    kurirCount++;
                    if (cbody) {
                        cbody.innerHTML += `
                            <tr>
                                <td>
                                    <div style="display:flex; align-items:center; gap:12px;">
                                        <div style="width:36px; height:36px; border-radius:50%; background:#1e293b; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                                            ${user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div class="text-bold">${user.name}</div>
                                            <div class="text-sub">${user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>KR-${user.id}00${user.id}</td>
                                <td>Seluruh Area</td>
                                <td><span class="text-bold">0</span> Paket</td>
                                <td><span class="status-pill status-pending">Standby</span></td>
                                <td style="text-align: right;"><button class="btn-ghost"><i class="fas fa-comment-dots"></i></button></td>
                            </tr>
                        `;
                    }
                }
            });

            if (cbody && cbody.innerHTML === '') {
                cbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Belum ada kurir terdaftar di sistem.</td></tr>';
            }

            const kpiTotal = document.getElementById('kpi-kurir-total');
            if (kpiTotal) kpiTotal.innerText = kurirCount;
            const kpiStandby = document.getElementById('kpi-kurir-standby');
            if (kpiStandby) kpiStandby.innerText = kurirCount; // All standby for now
        }
    });
}

function loadSystemLogs() {
    fetch('index.php?request=api/logistikita/system_logs')
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            const consoleEl = document.getElementById('api-logs-console');
            if (consoleEl) {
                consoleEl.innerHTML = '';
                if (data.data.length === 0) {
                    consoleEl.innerHTML = '<div style="color: #64748b;">[System] Tidak ada log aktivitas terbaru...</div>';
                    return;
                }
                
                data.data.forEach(log => {
                    // Parse timestamp to time only
                    const date = new Date(log.timestamp);
                    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
                    
                    let color = '#10b981'; // green for success/transit/delivered
                    if (log.status === 'pending') color = '#f59e0b';
                    else if (log.status === 'error' || log.status === 'batal') color = '#ef4444';

                    consoleEl.innerHTML += `<div style="color: ${color};">[${time}] EVENT /shipment/update - Resi: ${log.resi} -> ${log.status.toUpperCase()} (${log.lokasi})</div>`;
                });
                
                consoleEl.innerHTML += `<div style="color: #64748b;">[${new Date().toLocaleTimeString('id-ID')}] Waiting for upstream events...</div>`;
            }
        }
    })
    .catch(err => console.error("Error fetching logs:", err));
}

// Delegation for sidebar items
document.addEventListener('click', (e) => {
    const sidebarItem = e.target.closest('.sidebar-item');
    if (sidebarItem) {
        const target = sidebarItem.getAttribute('data-target');
        if (target) navToView(target);
    }
});

// Batch Approval Logic with Tab Filtering
const selectAll = document.getElementById('selectAllRequests');
const batchBar = document.getElementById('batchBar');
const batchCount = document.getElementById('batchCount');
const statusTabs = document.querySelectorAll('.status-tab');
const tableRows = document.querySelectorAll('#approvalTableBody tr');

function updateBatchBar() {
    // Count checked boxes only for VISIBLE rows
    const checkedCount = Array.from(tableRows).filter(row =>
        row.style.display !== 'none' &&
        row.querySelector('.request-check') &&
        row.querySelector('.request-check').checked
    ).length;

    if (batchBar && batchCount) {
        if (checkedCount > 0) {
            batchBar.style.display = 'flex';
            batchCount.innerText = checkedCount;
        } else {
            batchBar.style.display = 'none';
        }
    }
}

// Tab Switching Logic
statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const filter = tab.getAttribute('data-filter');

        // Update active tab UI
        statusTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Filter rows
        tableRows.forEach(row => {
            if (filter === 'all' || row.getAttribute('data-status') === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
                const check = row.querySelector('.request-check');
                if (check) check.checked = false; // Uncheck hidden rows
            }
        });

        if (selectAll) selectAll.checked = false;
        updateBatchBar();
    });
});

if (selectAll) {
    selectAll.addEventListener('change', () => {
        tableRows.forEach(row => {
            if (row.style.display !== 'none') {
                const check = row.querySelector('.request-check');
                if (check) check.checked = selectAll.checked;
            }
        });
        updateBatchBar();
    });
}

// Listen for individual check changes
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('request-check')) {
        updateBatchBar();
    }
});

// Leaflet Map Initialization
let map;
function initMap() {
    if (document.getElementById('map') && typeof L !== 'undefined') {
        // Center on Indonesia (Java region)
        if (!map) {
            map = L.map('map').setView([-6.2088, 106.8456], 7);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }

        // Custom Icon
        const truckIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fas fa-truck"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Clear existing markers if any
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Add active transit markers dynamically
        if (window.activeTransits && window.activeTransits.length > 0) {
            window.activeTransits.forEach((loc, index) => {
                const latOffset = (Math.random() - 0.5) * 2; 
                const lngOffset = (Math.random() - 0.5) * 2; 
                
                const lat = -6.2088 + latOffset;
                const lng = 106.8456 + lngOffset;

                L.marker([lat, lng], { icon: truckIcon })
                    .addTo(map)
                    .bindPopup(`<b>${loc.resi}</b><br>Tujuan: ${loc.penerima_nama}<br>Status: Moving`);
            });
        }
    }
}

let financeChartInstance = null;
function initFinanceChart(grossArray = [0, 0, 0, 0, 0, 0, 0], settlementArray = [0, 0, 0, 0, 0, 0, 0]) {
    const ctx = document.getElementById('financeChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (financeChartInstance) {
            financeChartInstance.destroy();
        }
        
        const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        let dynamicLabels = [];
        for (let i = 6; i >= 0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            dynamicLabels.push(days[d.getDay()]);
        }

        financeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dynamicLabels,
                datasets: [{
                    label: 'Gross Revenue (Rp)',
                    data: grossArray,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                }, {
                    label: 'Settlement (Rp)',
                    data: settlementArray,
                    borderColor: '#e11d48',
                    backgroundColor: 'rgba(225, 29, 72, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: '#e11d48'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: 'Outfit', weight: 'bold' },
                            usePointStyle: true,
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { font: { family: 'Outfit' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }
}

// Fetch Admin Data
function loadAdminData() {
    const userSession = localStorage.getItem('user');
    if (!userSession) {
        window.location.href = 'auth';
        return;
    }
    const user = JSON.parse(userSession);
    if (user.role !== 'admin') {
        window.location.href = 'auth';
        return;
    }

    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) userNameEl.innerText = user.name;

    fetch('index.php?request=api/logistikita/daftar_pengiriman&type=all')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const tbody = document.getElementById('approvalTableBody');
                if (tbody) tbody.innerHTML = '';
                const pengiriman = data.data;

                const kpiTotal = document.getElementById('kpi-total');
                if (kpiTotal) kpiTotal.innerText = pengiriman.length;

                let pendingCount = 0;
                let transitCount = 0;
                let deliveredCount = 0;
                let grossRevenue = 0;
                let miniGridHtml = '';
                let fleetHtml = '';
                let shipmentsHtml = '';
                window.activeTransits = []; // For Map

                pengiriman.forEach(item => {
                    grossRevenue += parseFloat(item.biaya_ongkir) + parseFloat(item.biaya_layanan || 0) + parseFloat(item.asuransi || 0);

                    let dateObj = new Date(item.created_at || Date.now());
                    let dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

                    let statusHtml = '';
                    if (item.status === 'pending') {
                        statusHtml = '<span class="status-pill status-pending">Menunggu Verifikasi</span>';
                    } else if (item.status === 'delivered') {
                        statusHtml = '<span class="status-pill status-success">Terkirim</span>';
                    } else {
                        statusHtml = `<span class="status-pill status-processing">${item.status.toUpperCase()}</span>`;
                    }

                    if (item.status === 'pending') pendingCount++;
                    if (item.status === 'transit') {
                        transitCount++;
                        window.activeTransits.push(item);
                        miniGridHtml += `
                                <tr>
                                    <td>${item.resi}</td>
                                    <td>${item.penerima_nama.substring(0, 10)}...</td>
                                    <td><span class="dot-online"></span></td>
                                </tr>
                            `;
                        fleetHtml += `
                                <tr>
                                    <td><span class="text-bold">${item.resi}</span></td>
                                    <td>Kurir LogistiKita</td>
                                    <td>Sistem Pusat</td>
                                    <td>Menuju Tujuan</td>
                                    <td>-</td>
                                    <td><span class="status-pill status-processing">Moving</span></td>
                                </tr>
                            `;
                    }
                    if (item.status === 'delivered') deliveredCount++;

                    shipmentsHtml += `
                            <tr>
                                <td><span class="text-bold">${item.resi}</span></td>
                                <td>Client ${item.user_id}</td>
                                <td>${item.penerima_nama}</td>
                                <td><span class="text-bold">${item.layanan || item.nama_layanan || '-'}</span></td>
                                <td>${statusHtml}</td>
                                <td>${dateStr}</td>
                                <td><button class="btn-ghost">Detail</button></td>
                            </tr>
                        `;

                    let actionHtml = `<span class="status-pill" style="background:#f1f5f9; color:#475569; font-weight:700;"><i class="fas fa-eye"></i> Monitoring</span>`;

                    if (tbody) {
                        tbody.innerHTML += `
                                <tr data-status="${item.status}">
                                    <td>
                                        <div style="display: flex; flex-direction: column;">
                                            <span class="text-bold"><span class="urgency-dot urgency-standard"></span>${item.resi}</span>
                                            <span class="text-sub">Penerima: ${item.penerima_nama}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="text-bold" style="color: var(--brand-red);">${item.nama_layanan || item.layanan_id}</span>
                                        <span class="text-sub">${item.penerima_alamat.substring(0,20)}...</span>
                                    </td>
                                    <td>${statusHtml}</td>
                                    <td style="text-align: center;">${actionHtml}</td>
                                </tr>
                            `;
                    }
                });

                if (pengiriman.length === 0 && tbody) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Belum ada permohonan pengiriman baru</td></tr>';
                }

                const kpiPending = document.getElementById('kpi-pending');
                if (kpiPending) kpiPending.innerText = pendingCount;
                const kpiArmada = document.getElementById('kpi-armada');
                if (kpiArmada) kpiArmada.innerText = transitCount;
                const kpiDelivered = document.getElementById('kpi-delivered');
                if (kpiDelivered) kpiDelivered.innerText = deliveredCount;

                const tabAll = document.getElementById('tab-count-all');
                if (tabAll) tabAll.innerText = pengiriman.length;
                const tabPending = document.getElementById('tab-count-pending');
                if (tabPending) tabPending.innerText = pendingCount;
                const tabDelivered = document.getElementById('tab-count-delivered');
                if (tabDelivered) tabDelivered.innerText = deliveredCount;

                const fleetActive = document.getElementById('fleet-active');
                if (fleetActive) fleetActive.innerText = transitCount;
                const fleetTransit = document.getElementById('fleet-transit');
                if (fleetTransit) fleetTransit.innerText = transitCount;
                const fleetArriving = document.getElementById('fleet-arriving');
                if (fleetArriving) fleetArriving.innerText = deliveredCount;

                const miniGrid = document.getElementById('mini-grid-body');
                if (miniGrid) {
                    if (miniGridHtml === '') miniGridHtml = '<tr><td colspan="3" style="text-align:center;">Tidak ada armada di jalan</td></tr>';
                    miniGrid.innerHTML = miniGridHtml;
                }

                const fleetBody = document.getElementById('fleet-table-body');
                if (fleetBody) {
                    if (fleetHtml === '') fleetHtml = '<tr><td colspan="6" style="text-align:center;">Tidak ada armada di jalan</td></tr>';
                    fleetBody.innerHTML = fleetHtml;
                }

                const shipmentsBody = document.getElementById('shipments-table-body');
                if (shipmentsBody) {
                    if (shipmentsHtml === '') shipmentsHtml = '<tr><td colspan="7" style="text-align:center;">Belum ada data pengiriman global</td></tr>';
                    shipmentsBody.innerHTML = shipmentsHtml;
                }

                const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
                const grossEl = document.getElementById('finance-gross');
                if (grossEl) grossEl.innerText = formatter.format(grossRevenue);
                const settleEl = document.getElementById('finance-settlement');
                if (settleEl) settleEl.innerText = formatter.format(grossRevenue * 0.1); 
                const marginEl = document.getElementById('finance-margin');
                if (marginEl) marginEl.innerText = '95.5%';

                // Update Map
                initMap();

                // Update Chart Data (Dinamic from Database)
                let gData = [0, 0, 0, 0, 0, 0, 0];
                let sData = [0, 0, 0, 0, 0, 0, 0];
                
                let today = new Date();
                today.setHours(0,0,0,0);
                
                pengiriman.forEach(item => {
                    let itemDate = new Date(item.created_at);
                    itemDate.setHours(0,0,0,0);
                    let diffTime = Math.abs(today - itemDate);
                    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 7) {
                        let rev = parseFloat(item.biaya_ongkir) + parseFloat(item.biaya_layanan || 0) + parseFloat(item.asuransi || 0);
                        gData[6 - diffDays] += rev; // index 6 is today, 5 is yesterday, etc.
                        sData[6 - diffDays] += rev * 0.7; // simulate settlement logic
                    }
                });

                if (gData.reduce((a, b) => a + b, 0) === 0) {
                    // Fallback visual if no revenue in last 7 days
                    gData = [100000, 200000, 150000, 300000, 200000, 400000, 500000];
                    sData = gData.map(v => v * 0.7);
                }

                initFinanceChart(gData, sData);
            }
        });

    fetch('index.php?request=api/logistikita/biaya_layanan_logistik')
        .then(r => r.json())
        .then(d => {
            if (d.status === 'success') {
                const totalFeeStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(d.data.total_fee);
                const el = document.getElementById('finance-total-fee');
                if (el) el.innerText = totalFeeStr;
            }
        });

    loadUsers();
    loadSystemLogs();
    loadBookkeepingData();
}



function updateStatus(resi, newStatus) {
    Swal.fire({
        title: 'Konfirmasi',
        text: `Terima pesanan ${resi}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--brand-primary)',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Terima!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('index.php?request=api/logistikita/tracking_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resi: resi, status: newStatus, lokasi: 'Admin HQ', keterangan: 'Pesanan diverifikasi' })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Berhasil',
                            text: 'Status berhasil diupdate!',
                            timer: 1500,
                            showConfirmButton: false
                        });
                        loadAdminData();
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Gagal',
                            text: 'Gagal update status: ' + data.message
                        });
                    }
                })
                .catch(err => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Kesalahan',
                        text: 'Gagal terhubung ke server.'
                    });
                });
        }
    });
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initFinanceChart();
    loadAdminData();

    if (btnAdmin) btnAdmin.addEventListener('click', switchToAdmin);
    if (btnFinance) btnFinance.addEventListener('click', switchToFinance);
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
});

// ==========================================
// HUB OPERATIONS (BARCODE SCANNER) LOGIC
// ==========================================
let sessionScanCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const resiInput = document.getElementById('scanResiInput');
    const locationInput = document.getElementById('scanLocationInput');
    const btnUpdateScan = document.getElementById('btnUpdateScan');
    
    if (resiInput) {
        resiInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Mencegah submit form bawaan browser
                
                const resiVal = this.value.trim().toUpperCase();
                if (!resiVal) return;
                
                // Simulasi auto-fill cabang berdasarkan data resi (cepat)
                if (resiVal.includes('SBY')) {
                    locationInput.value = 'Hub Surabaya';
                } else {
                    locationInput.value = 'Hub Bandung';
                }
                
                // Pindah fokus langsung ke tombol update (Workflow Scanner)
                if (btnUpdateScan) btnUpdateScan.focus();
            }
        });
    }
});

function submitHubUpdate() {
    const resiInput = document.getElementById('scanResiInput');
    const locationInput = document.getElementById('scanLocationInput');
    const statusSelect = document.getElementById('scanStatusAction');
    const historyList = document.getElementById('scanHistoryList');
    const emptyState = document.getElementById('emptyScanState');
    const countBadge = document.getElementById('sessionScanCount');
    
    const resi = resiInput.value.trim().toUpperCase();
    const lokasi = locationInput.value || 'Hub Bandung';
    const status = statusSelect.value;
    
    if (!resi) {
        Swal.fire({
            icon: 'warning',
            title: 'Resi Kosong',
            text: 'Silakan scan barcode resi terlebih dahulu.',
            confirmButtonColor: '#10b981'
        }).then(() => {
            resiInput.focus();
        });
        return;
    }
    
    // 1. Menampilkan notifikasi sukses yang cepat (tidak memblokir layar terlalu lama)
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Resi ${resi} diupdate!`,
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
    });
    
    // 2. Prepend ke daftar riwayat (di bagian atas)
    if (emptyState) emptyState.style.display = 'none';
    
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
                    String(now.getMinutes()).padStart(2, '0') + ':' + 
                    String(now.getSeconds()).padStart(2, '0');
                    
    const li = document.createElement('li');
    li.style.padding = '16px 24px';
    li.style.borderBottom = '1px solid #e2e8f0';
    li.style.backgroundColor = '#ffffff';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.transition = 'all 0.3s ease';
    
    li.innerHTML = `
        <div>
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; font-size: 1.1rem;">${resi}</div>
            <div style="font-size: 0.85rem; color: #64748b;">
                <span style="color: #10b981; font-weight: 700;">${status}</span> &bull; ${lokasi}
            </div>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8; font-weight: 600;">
            <i class="far fa-clock"></i> ${timeStr}
        </div>
    `;
    
    historyList.insertBefore(li, historyList.firstChild);
    
    // Update counter
    sessionScanCount++;
    if (countBadge) countBadge.innerText = `${sessionScanCount} Paket`;
    
    // 3. Reset form and auto-focus back to input for rapid scanning
    resiInput.value = '';
    locationInput.value = '';
    resiInput.focus();
}

// ==========================================
// CAMERA SCANNER LOGIC (html5-qrcode)
// ==========================================
let html5QrcodeScanner = null;

function startCameraScan() {
    const readerDiv = document.getElementById('reader');
    if (!readerDiv) return;
    
    // Toggle visibility
    if (readerDiv.style.display === 'block') {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(e => console.error(e));
        }
        readerDiv.style.display = 'none';
        return;
    }
    
    readerDiv.style.display = 'block';
    
    // Inisialisasi scanner jika belum ada
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 300, height: 150 }, // Bentuk persegi panjang cocok untuk barcode
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] 
            },
            false
        );
    }
    
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText, decodedResult) {
    // 1. Matikan kamera setelah berhasil dapat data
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(error => {
            console.error("Gagal menghentikan scanner.", error);
        });
    }
    document.getElementById('reader').style.display = 'none';
    
    // 2. Isi kolom input
    const resiInput = document.getElementById('scanResiInput');
    if (resiInput) {
        resiInput.value = decodedText;
        
        // 3. Simulasikan auto-fill cabang
        const locationInput = document.getElementById('scanLocationInput');
        const resiVal = decodedText.trim().toUpperCase();
        
        if (resiVal.includes('SBY')) {
            locationInput.value = 'Hub Surabaya';
        } else {
            locationInput.value = 'Hub Bandung';
        }
        
        // 4. Fokuskan ke tombol update
        const btnUpdateScan = document.getElementById('btnUpdateScan');
        if (btnUpdateScan) btnUpdateScan.focus();
        
        // Opsional: Bunyikan suara Beep sukses ringan
        try {
            const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3');
            audio.play();
        } catch(e) {}
    }
}

function onScanFailure(error) {
    // Diabaikan karena scanner akan terus membaca frame demi frame
}

// ==========================================
// CORPORATE BOOKKEEPING & PDF EXPORT LOGIC
// ==========================================
let bookkeepingDataGlobal = [];

function loadBookkeepingData() {
    fetch('index.php?request=api/logistikita/pembukuan_perusahaan')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                bookkeepingDataGlobal = data.data;
                const tbody = document.getElementById('bookkeepingTableBody');
                if (tbody) tbody.innerHTML = '';

                let totalPemasukan = 0;
                let totalPengeluaran = 0;
                let totalServiceFee = 0;

                data.data.forEach(item => {
                    const amount = parseFloat(item.jumlah);
                    if (item.jenis === 'pemasukan') {
                        totalPemasukan += amount;
                    } else if (item.jenis === 'pengeluaran') {
                        totalPengeluaran += amount;
                    }

                    if (item.kategori === 'pajak_layanan') {
                        totalServiceFee += amount;
                    }

                    let badgeStatus = '';
                    if (item.status_barang === 'masuk_sistem') {
                        badgeStatus = '<span class="status-pill status-pending">Masuk Sistem</span>';
                    } else if (item.status_barang === 'transit_hub') {
                        badgeStatus = '<span class="status-pill status-processing">Transit Hub</span>';
                    } else if (item.status_barang === 'sedang_dikirim') {
                        badgeStatus = '<span class="status-pill status-processing" style="background-color: #3b82f6; color: white;">Sedang Dikirim</span>';
                    } else if (item.status_barang === 'diterima_konsumen') {
                        badgeStatus = '<span class="status-pill status-success">Diterima Konsumen</span>';
                    } else if (item.status_barang === 'dibatalkan') {
                        badgeStatus = '<span class="status-pill status-danger" style="background-color: #ef4444; color: white;">Dibatalkan</span>';
                    } else {
                        badgeStatus = `<span class="status-pill">${item.status_barang}</span>`;
                    }

                    let typeBadge = item.jenis === 'pemasukan' 
                        ? '<span style="color: #10b981; font-weight: 800;"><i class="fas fa-arrow-down"></i> Pemasukan</span>' 
                        : '<span style="color: #ef4444; font-weight: 800;"><i class="fas fa-arrow-up"></i> Pengeluaran</span>';

                    const dateObj = new Date(item.created_at);
                    const timeStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;

                    if (tbody) {
                        tbody.innerHTML += `
                            <tr>
                                <td>${timeStr}</td>
                                <td><span class="text-bold">${item.resi}</span></td>
                                <td>${item.penerima_nama}</td>
                                <td>${badgeStatus}</td>
                                <td><span class="status-pill" style="background: #f1f5f9; color: #475569; font-weight: 700;">${item.kategori.toUpperCase()}</span></td>
                                <td>${typeBadge}</td>
                                <td class="text-bold ${item.jenis === 'pemasukan' ? 'text-success' : 'text-danger'}">
                                    ${item.jumlah > 0 ? `Rp ${amount.toLocaleString('id-ID')}` : '-'}
                                </td>
                                <td style="font-size: 0.85rem; color: #64748b;">${item.keterangan}</td>
                            </tr>
                        `;
                    }
                });

                if (data.data.length === 0 && tbody) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Belum ada catatan pembukuan.</td></tr>';
                }

                // Update KPI Metrics in Finance View
                const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
                
                const balanceVal = totalPemasukan - totalPengeluaran;
                const balanceEl = document.getElementById('finance-company-balance');
                if (balanceEl) balanceEl.innerText = formatter.format(balanceVal);

                const expenseEl = document.getElementById('finance-total-expenses');
                if (expenseEl) expenseEl.innerText = formatter.format(totalPengeluaran);

                const feeEl = document.getElementById('finance-total-fee');
                if (feeEl) feeEl.innerText = formatter.format(totalServiceFee);

                const grossEl = document.getElementById('finance-gross');
                if (grossEl) grossEl.innerText = formatter.format(totalPemasukan);
            }
        })
        .catch(err => console.error("Error loading bookkeeping data:", err));
}

function exportBookkeepingToPDF() {
    if (bookkeepingDataGlobal.length === 0) {
        Swal.fire('Info', 'Tidak ada data pembukuan untuk diekspor.', 'info');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    // 1. Add Header (Kop Surat)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(225, 29, 72); // Brand Red Color
    doc.text("LogistiKita Enterprise", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Komplek Logistik Nasional Blok B1, Jakarta, Indonesia", 14, 25);
    doc.text("Email: finance@logistikita.com | Web: www.logistikita.com", 14, 29);

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 282, 32);

    // 2. Title & Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN BUKU BESAR & PEMBUKUAN PERUSAHAAN", 14, 42);

    const now = new Date();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`, 14, 47);

    // 3. Prepare data for Table
    const headers = [["Waktu", "Resi", "Penerima", "Status Barang", "Kategori", "Jenis", "Jumlah", "Keterangan"]];
    const rows = bookkeepingDataGlobal.map(item => {
        const dateObj = new Date(item.created_at);
        const timeStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2,'0')}:${String(dateObj.getMinutes()).padStart(2,'0')}`;
        const amountStr = item.jumlah > 0 ? `Rp ${parseFloat(item.jumlah).toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : 'Rp 0';
        return [
            timeStr,
            item.resi,
            item.penerima_nama,
            item.status_barang.toUpperCase(),
            item.kategori.toUpperCase(),
            item.jenis.toUpperCase(),
            amountStr,
            item.keterangan
        ];
    });

    // 4. Draw AutoTable
    doc.autoTable({
        head: headers,
        body: rows,
        startY: 53,
        theme: 'striped',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 3
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 25 },
            6: { cellWidth: 30, halign: 'right' },
            7: { cellWidth: 'auto' }
        }
    });

    // Save the PDF
    doc.save(`Laporan_Pembukuan_LogistiKita_${now.toISOString().slice(0,10)}.pdf`);
}

function exportFinanceSummaryToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // 1. Add Header (Kop Surat)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(225, 29, 72);
    doc.text("LogistiKita Enterprise", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Komplek Logistik Nasional Blok B1, Jakarta, Indonesia", 14, 25);
    doc.text("Email: finance@logistikita.com | Web: www.logistikita.com", 14, 29);

    // Line separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // 2. Title & Date
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("LAPORAN RINGKASAN KEUANGAN & NERACA KAS", 14, 42);

    const now = new Date();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID')}`, 14, 47);

    // 3. Financial Summary Card values
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let totalServiceFee = 0;

    bookkeepingDataGlobal.forEach(item => {
        const amount = parseFloat(item.jumlah);
        if (item.jenis === 'pemasukan') {
            totalPemasukan += amount;
        } else if (item.jenis === 'pengeluaran') {
            totalPengeluaran += amount;
        }
        if (item.kategori === 'pajak_layanan') {
            totalServiceFee += amount;
        }
    });

    const saldoBersih = totalPemasukan - totalPengeluaran;

    const summaryData = [
        ["Indikator Keuangan", "Nilai Kas (Rupiah)", "Keterangan Operasional"],
        ["Uang Yang Dimiliki (Saldo Bersih)", `Rp ${saldoBersih.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, "Kas internal perusahaan saat ini"],
        ["Total Pengeluaran (Beban)", `Rp ${totalPengeluaran.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, "Komisi kurir, refund, tip diteruskan, pajak"],
        ["Total Pendapatan Layanan", `Rp ${totalServiceFee.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, "Fee 5% dari pengiriman terselesaikan"],
        ["Gross Revenue (Omset)", `Rp ${totalPemasukan.toLocaleString('id-ID', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`, "Akumulasi seluruh transaksi masuk"]
    ];

    doc.autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: 55,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 4
        },
        headStyles: {
            fillColor: [225, 29, 72],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
            2: { cellWidth: 'auto' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Dilaporkan Oleh,", 14, finalY);
    doc.text("Disetujui Oleh,", 140, finalY);

    doc.setFont("helvetica", "bold");
    doc.text("Fiqry F.", 14, finalY + 20);
    doc.text("System Administrator", 14, finalY + 24);

    doc.text("Direktur Utama", 140, finalY + 20);
    doc.text("LogistiKita Corp.", 140, finalY + 24);

    doc.save(`Ringkasan_Keuangan_LogistiKita_${now.toISOString().slice(0,10)}.pdf`);
}

window.exportBookkeepingToPDF = exportBookkeepingToPDF;
window.exportFinanceSummaryToPDF = exportFinanceSummaryToPDF;
window.loadBookkeepingData = loadBookkeepingData;

function logoutAdmin() {
    localStorage.removeItem('user');
    window.location.href = 'auth';
}
window.logoutAdmin = logoutAdmin;
