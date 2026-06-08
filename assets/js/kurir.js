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

let map;
let packageCount = 12;
let activeResi = null;
let globalActiveMission = null;
let knapsackEnabled = false;
let maxCapacity = 20;
let currentShipments = [];

const upcomingList = document.getElementById('upcoming-task-list');
const historyBody = document.getElementById('history-table-body');
const mobileHistory = document.getElementById('mobile-history-list');

function initMap() {
    try {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        if (map) { map.remove(); }
        if (typeof L === 'undefined') return;

        map = L.map('map', { zoomControl: false }).setView([-6.9175, 107.6191], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);

        if (globalActiveMission) {
            const hubIcon = L.divIcon({ className: 'marker', html: '<div style="background:#0f172a; width:12px; height:12px; border-radius:50%; border:3px solid white;"></div>' });
            const destIcon = L.divIcon({ className: 'marker', html: '<div style="background:#e11d48; width:14px; height:14px; border-radius:50%; border:3px solid white;"></div>' });

            // Simple deterministic coordinate generation based on resi
            const hash = Array.from(globalActiveMission.resi).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const latOffset1 = (hash % 100) / 10000;
            const lngOffset1 = ((hash * 2) % 100) / 10000;
            const latOffset2 = ((hash * 3) % 100) / 10000;
            const lngOffset2 = ((hash * 5) % 100) / 10000;

            const p1 = [-6.9175 + latOffset1, 107.6191 + lngOffset1];
            const p2 = [-6.9388 + latOffset2, 107.7233 + lngOffset2];

            L.marker(p1, { icon: hubIcon }).addTo(map).bindPopup('Lokasi Kurir');
            L.marker(p2, { icon: destIcon }).addTo(map).bindPopup(globalActiveMission.penerima_nama);

            const polyline = L.polyline([p1, p2], { color: '#e11d48', weight: 4, dashArray: '5, 10' }).addTo(map);
            map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
        }

        setTimeout(() => { map.invalidateSize(); }, 400);
    } catch (e) {
        console.error("Map initialization failed:", e);
    }
}

function switchView(viewId, element) {
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    const target = document.getElementById('view-' + viewId);
    if (target) {
        target.classList.add('active');
        if (viewId === 'dashboard') setTimeout(initMap, 100);
    }

    const fab = document.getElementById('fab-qr');
    if (fab) {
        if (viewId === 'dashboard' || viewId === 'active-mission') {
            fab.classList.add('visible');
        } else {
            fab.classList.remove('visible');
        }
    }

    document.querySelectorAll('.sidebar-item, .nav-item').forEach(item => item.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        const navItems = document.querySelectorAll('.sidebar-item, .nav-item');
        navItems.forEach(item => {
            const text = item.innerText.toLowerCase();
            if (text.includes(viewId.replace('-', ' '))) item.classList.add('active');
            else if (viewId === 'dashboard' && (text.includes('home') || text.includes('dashboard'))) item.classList.add('active');
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openActiveMission() {
    if (globalActiveMission) {
        viewActiveMission(globalActiveMission.resi, globalActiveMission.penerima_nama, globalActiveMission.status);
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Tidak Ada Misi Aktif',
            text: 'Saat ini belum ada paket yang sedang dalam perjalanan (Transit). Silakan PICKUP paket dari antrean.'
        });
        switchView('active-mission'); // just switch
    }
}

function logoutKurir() {
    localStorage.removeItem('user');
    window.location.href = 'auth';
}

function viewActiveMission(resi, dest, status) {
    activeResi = resi;
    const resiEl = document.getElementById('mission-resi');
    if (resiEl) resiEl.innerText = resi;
    const statusEl = document.getElementById('mission-status');
    if (statusEl) statusEl.innerText = status.toUpperCase();
    const destEl = document.getElementById('mission-dest');
    if (destEl) destEl.innerText = dest;

    const btn = document.getElementById('mission-btn');
    if (btn) {
        if (status === 'transit') {
            btn.style.display = 'block';
            btn.onclick = () => completeActiveMission(resi);
        } else {
            btn.style.display = 'none';
        }
    }
    switchView('active-mission');
}

function completeActiveMission(resi) {
    if (!resi) return;
    updateStatus(resi, 'delivered');
}

function loadKurirData() {
    const userSession = localStorage.getItem('user');
    if (!userSession) {
        window.location.href = 'auth';
        return;
    }
    const user = JSON.parse(userSession);

    if (user.role !== 'kurir') {
        window.location.href = 'auth';
        return;
    }

    const greeting = document.getElementById('desktop-greeting');
    if (greeting) greeting.innerText = `Selamat datang kembali, ${user.name}. Siap untuk pengiriman hari ini?`;
    const mobileName = document.getElementById('mobile-name');
    if (mobileName) mobileName.innerText = user.name;
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.innerText = user.name;

    const mobAvatar = document.getElementById('mobile-avatar');
    if (mobAvatar) mobAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=e11d48&color=ffffff&bold=true`;
    const profAvatar = document.getElementById('profile-avatar-large');
    if (profAvatar) profAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f172a&color=ffffff&bold=true&size=150`;

    // Fetch SmartBank balance
    fetch(`index.php?request=api/smartbank/saldo&email=${encodeURIComponent(user.email)}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const balanceVal = parseFloat(data.data.saldo);
                const earnTotal = document.getElementById('earnings-total');
                const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
                if (earnTotal) earnTotal.innerText = formatter.format(balanceVal);
            }
        })
        .catch(err => console.error("Error loading courier balance:", err));

    fetch('index.php?request=api/logistikita/daftar_pengiriman&type=kurir')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const pengiriman = data.data;
                currentShipments = pengiriman; // Store fetched shipments globally
                
                const earningsHistory = document.getElementById('earnings-history');
                if (upcomingList) upcomingList.innerHTML = '';
                if (historyBody) historyBody.innerHTML = '';
                if (mobileHistory) mobileHistory.innerHTML = '';
                if (earningsHistory) earningsHistory.innerHTML = '';

                let pkgCount = 0;
                let totalProfit = 0;
                globalActiveMission = null;

                // Find active mission first
                for (let item of currentShipments) {
                    if (item.status === 'transit') {
                        globalActiveMission = item;
                        break;
                    }
                }

                currentShipments.forEach(item => {
                    const dateObj = new Date(item.created_at);
                    const timeStr = `${dateObj.getDate()} ${dateObj.toLocaleString('id-ID', { month: 'short' })}, ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

                    if (item.status !== 'delivered') {
                        pkgCount++;
                    } else {
                        // History & Earnings (Commission 10% + Tips)
                        const profit = Math.floor(item.biaya_ongkir * 0.1);
                        const tip = parseFloat(item.tip || 0);
                        const totalEarning = profit + tip;
                        totalProfit += totalEarning;

                        if (historyBody) {
                            historyBody.innerHTML += `
                                <tr style="border-bottom: 1px solid #f1f5f9; cursor: pointer;" onclick="viewActiveMission('${item.resi}', '${item.penerima_nama}', '${item.status}')">
                                    <td style="padding: 16px; font-weight: 800;">${item.resi}</td>
                                    <td style="padding: 16px; font-size: 0.85rem;">${timeStr}</td>
                                    <td style="padding: 16px; font-weight: 800; color: var(--brand-green);">
                                        +Rp ${totalEarning.toLocaleString('id-ID')}
                                        ${tip > 0 ? `<br><small style="color:var(--text-gray); font-weight:normal;">(Komisi: Rp ${profit.toLocaleString('id-ID')}, Tip: Rp ${tip.toLocaleString('id-ID')})</small>` : ''}
                                    </td>
                                    <td style="padding: 16px;"><span class="status-pill success">DONE</span></td>
                                </tr>
                            `;
                        }

                        if (mobileHistory) {
                            mobileHistory.innerHTML += `
                                <div class="enterprise-card" style="margin-bottom: 12px; padding: 20px;" onclick="viewActiveMission('${item.resi}', '${item.penerima_nama}', '${item.status}')">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div>
                                            <div style="font-weight:900;">${item.resi}</div>
                                            <div style="font-size:0.75rem; color:var(--text-gray);">${timeStr}</div>
                                            ${tip > 0 ? `<div style="font-size:0.7rem; color:var(--text-gray);">Komisi: Rp ${profit.toLocaleString('id-ID')} | Tip: Rp ${tip.toLocaleString('id-ID')}</div>` : ''}
                                        </div>
                                        <div style="text-align:right;">
                                            <div style="font-weight:900; color:var(--brand-green);">+Rp ${totalEarning.toLocaleString('id-ID')}</div>
                                            <span class="status-pill success" style="font-size:0.6rem;">DONE</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }

                        if (earningsHistory) {
                            earningsHistory.innerHTML += `
                                <div style="padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-weight:800; font-size:0.9rem;">Komisi & Tip ${item.resi}</div>
                                        <div style="font-size:0.75rem; color:var(--text-gray);">${timeStr}</div>
                                        ${tip > 0 ? `<div style="font-size:0.75rem; color:var(--text-gray);">Komisi: Rp ${profit.toLocaleString('id-ID')} | Tip: Rp ${tip.toLocaleString('id-ID')}</div>` : ''}
                                    </div>
                                    <div style="font-weight:900; color:var(--brand-green);">+Rp ${totalEarning.toLocaleString('id-ID')}</div>
                                </div>
                            `;
                        }
                    }
                });

                const statPackages = document.getElementById('stat-packages');
                if (statPackages) statPackages.innerText = pkgCount;

                const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
                const statProfit = document.getElementById('stat-profit');
                if (statProfit) statProfit.innerText = formatter.format(totalProfit);

                if (currentShipments.length === 0) {
                    if (historyBody) historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada riwayat misi</td></tr>';
                    if (mobileHistory) mobileHistory.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-gray);">Belum ada riwayat misi</div>';
                    if (earningsHistory) earningsHistory.innerHTML = '<div style="padding: 20px; text-align:center; color:var(--text-gray);">Belum ada komisi masuk.</div>';
                }

                // Render active tasks using Greedy Knapsack logic
                renderUpcomingTasks();

                initMap();
            }
        });
}

function solveKnapsack() {
    if (!knapsackEnabled) return { selectedResi: [], totalWeight: 0, totalProfit: 0 };

    // 1. Ambil paket yang statusnya belum selesai (delivered)
    let activeItems = currentShipments.filter(item => item.status !== 'delivered');

    // 2. Petakan paket dengan atribut Knapsack
    let knapsackItems = activeItems.map(item => {
        const berat = parseFloat(item.berat) || 0;
        const ongkir = parseFloat(item.biaya_ongkir) || 0;
        const profit = Math.floor(ongkir * 0.1); // Komisi kurir 10%
        // Densitas Nilai (Value Density) = profit / berat. Hindari pembagian dengan 0.
        const density = berat > 0 ? profit / berat : profit;
        return {
            resi: item.resi,
            berat: berat,
            profit: profit,
            density: density,
            original: item
        };
    });

    // 3. Sortir paket berdasarkan Densitas tertinggi ke terendah (Greedy Heuristic)
    // Jika densitas sama, pilih berat yang lebih ringan terlebih dahulu
    knapsackItems.sort((a, b) => {
        if (b.density !== a.density) {
            return b.density - a.density;
        }
        return a.berat - b.berat;
    });

    // 4. Proses Greedy Selection
    let selectedResi = [];
    let currentWeight = 0;
    let currentProfit = 0;

    for (let item of knapsackItems) {
        if (currentWeight + item.berat <= maxCapacity) {
            selectedResi.push(item.resi);
            currentWeight += item.berat;
            currentProfit += item.profit;
        }
    }

    return {
        selectedResi: selectedResi,
        totalWeight: currentWeight,
        totalProfit: currentProfit
    };
}

function toggleKnapsack(checkbox) {
    knapsackEnabled = checkbox.checked;
    const controls = document.getElementById('knapsack-controls');
    if (controls) {
        controls.style.display = knapsackEnabled ? 'block' : 'none';
    }
    renderUpcomingTasks();
}

function updateCapacity(val) {
    maxCapacity = parseInt(val) || 20;
    const capacityVal = document.getElementById('capacity-value');
    if (capacityVal) {
        capacityVal.innerText = maxCapacity + ' Kg';
    }
    renderUpcomingTasks();
}

function renderUpcomingTasks() {
    if (!upcomingList) return;
    upcomingList.innerHTML = '';

    const knapsackResult = solveKnapsack();
    let activeItems = currentShipments.filter(item => item.status !== 'delivered');

    if (activeItems.length === 0) {
        upcomingList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-gray);">Semua misi telah selesai!</div>';
        updateKnapsackSummary(0, 0);
        return;
    }

    // Jika optimasi Knapsack aktif, urutkan agar rekomendasi Greedy berada di paling atas
    if (knapsackEnabled) {
        activeItems.sort((a, b) => {
            const aSelected = knapsackResult.selectedResi.includes(a.resi) ? 1 : 0;
            const bSelected = knapsackResult.selectedResi.includes(b.resi) ? 1 : 0;
            return bSelected - aSelected;
        });
    }

    activeItems.forEach(item => {
        const isSelected = knapsackEnabled && knapsackResult.selectedResi.includes(item.resi);
        const weight = parseFloat(item.berat) || 0;
        const profit = Math.floor((parseFloat(item.biaya_ongkir) || 0) * 0.1);
        
        let badge = '';
        let cardStyle = 'background: white; border: 1px solid var(--card-border);';
        
        if (isSelected) {
            badge = `<span class="status-pill success" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.65rem; display: inline-flex; align-items: center; gap: 4px; text-transform: uppercase;"><i class="fas fa-truck-ramp-box"></i> Rekomendasi Angkut</span>`;
            cardStyle = 'background: #f0f9ff; border: 2px solid #0284c7; box-shadow: 0 4px 15px rgba(2, 132, 199, 0.1);';
        }

        upcomingList.innerHTML += `
            <div class="task-item" style="${cardStyle}" onclick="viewActiveMission('${item.resi}', '${item.penerima_nama}', '${item.status}')">
                <div style="display:flex; align-items:center; gap:14px; flex: 1;">
                    <div class="kpi-icon" style="width:48px; height:48px; font-size: 1.2rem; background: ${isSelected ? '#e0f2fe' : '#f1f5f9'}; color: ${isSelected ? '#0284c7' : 'var(--brand-red)'};"><i class="fas fa-box"></i></div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight:900; font-size: 0.9rem;">${item.resi}</span>
                            ${badge}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-gray); margin-top: 4px;">
                            Status: <strong style="color:var(--brand-dark);">${item.status.toUpperCase()}</strong> | 
                            Berat: <strong style="color:var(--brand-dark);">${weight} Kg</strong> | 
                            Komisi: <strong style="color:var(--brand-green);">Rp ${profit.toLocaleString('id-ID')}</strong>
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap: 8px; margin-left: 12px;">
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 0.7rem; border-radius: 8px;" onclick="event.stopPropagation(); updateStatus('${item.resi}', 'transit')">PICKUP</button>
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 0.7rem; border-radius: 8px; background:var(--brand-green);" onclick="event.stopPropagation(); updateStatus('${item.resi}', 'delivered')">DONE</button>
                </div>
            </div>
        `;
    });

    updateKnapsackSummary(knapsackResult.totalWeight, knapsackResult.totalProfit);
}

function updateKnapsackSummary(weight, profit) {
    const totalWeightText = document.getElementById('knapsack-total-weight');
    const progressBar = document.getElementById('knapsack-progress-bar');
    const totalProfitText = document.getElementById('knapsack-total-profit');

    if (totalWeightText) {
        totalWeightText.innerText = `${weight.toFixed(1)} / ${maxCapacity} Kg`;
    }
    if (progressBar) {
        const percent = Math.min(100, (weight / maxCapacity) * 100);
        progressBar.style.width = percent + '%';
        if (percent > 90) {
            progressBar.style.backgroundColor = '#ef4444'; // Red if near/over capacity
        } else if (percent > 70) {
            progressBar.style.backgroundColor = '#f59e0b'; // Amber if high load
        } else {
            progressBar.style.backgroundColor = 'var(--brand-green)'; // Safe Green
        }
    }
    if (totalProfitText) {
        const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
        totalProfitText.innerText = formatter.format(profit);
    }
}

function updateStatus(resi, newStatus) {
    Swal.fire({
        title: 'Konfirmasi Status',
        text: `Update status resi ${resi} menjadi ${newStatus.toUpperCase()}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Update!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('index.php?request=api/logistikita/tracking_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resi: resi, status: newStatus, lokasi: 'Kurir App', keterangan: 'Updated by Courier' })
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
                        loadKurirData();
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

function simulateScan() {
    Swal.fire({
        icon: 'info',
        title: 'QR Scanner',
        text: 'Simulator QR Scan Aktif. Kamera tidak terdeteksi di versi browser desktop.',
        confirmButtonColor: '#0f172a'
    });
}

// Global scope functions for onclick attributes
window.switchView = switchView;
window.openActiveMission = openActiveMission;
window.logoutKurir = logoutKurir;
window.updateStatus = updateStatus;
window.simulateScan = simulateScan;
window.toggleKnapsack = toggleKnapsack;
window.updateCapacity = updateCapacity;

document.addEventListener('DOMContentLoaded', loadKurirData);
