const tabs = document.querySelectorAll('.hub-tab');
const panes = document.querySelectorAll('.tab-pane');

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();

        // Update active state on nav links
        tabs.forEach(t => {
            t.classList.remove('active');
        });

        tab.classList.add('active');

        // Switch content panes
        const target = tab.getAttribute('data-target');
        panes.forEach(p => p.classList.remove('active'));
        document.getElementById(target).classList.add('active');

        // Close sidebars if open
        if (typeof closeAllSidebars === 'function') {
            closeAllSidebars();
        }

        // Add minor smooth scroll to top of content if on mobile
        if (window.innerWidth < 768) {
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    });
});

// Single Mobile Sidebar Toggle Logic
const hamburgerBtn = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    if (sidebar) sidebar.classList.add('active');
    if (sidebarOverlay) sidebarOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSidebarAction() {
    if (sidebar) sidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarAction);

// Also close sidebar on link click
tabs.forEach(tab => {
    tab.addEventListener('click', closeSidebarAction);
});

// ================= INTEGRASI API =================
// 1. Cek Tarif
const btnHitung = document.getElementById('btn-hitung-biaya');
if (btnHitung) {
    btnHitung.addEventListener('click', function () {
        const asal = document.getElementById('ongkir-asal').value;
        const tujuan = document.getElementById('ongkir-tujuan').value;
        const berat = document.getElementById('ongkir-weight').value;
        const layanan = document.getElementById('ongkir-service').options[document.getElementById('ongkir-service').selectedIndex].text;

        if (!asal || !tujuan || !berat) {
            Swal.fire({
                icon: 'warning',
                title: 'Data Tidak Lengkap',
                text: 'Mohon lengkapi asal, tujuan, dan berat!'
            });
            return;
        }

        btnHitung.innerText = 'Menghitung...';

        fetch('http://localhost/logistikita/index.php?request=api/logistikita/biaya_pengiriman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asal, tujuan, berat, layanan })
        })
            .then(res => res.json())
            .then(data => {
                btnHitung.innerText = 'Hitung Biaya';
                if (data.status === 'success') {
                    // Format Rupiah
                    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
                    document.getElementById('hasil-ongkir').innerText = "Estimasi Biaya: " + formatter.format(data.data.biaya_ongkir);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: data.message
                    });
                }
            })
            .catch(err => {
                btnHitung.innerText = 'Hitung Biaya';
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan',
                    text: 'Gagal terhubung ke server'
                });
            });
    });
}

// 2. Tracking Resi
const btnTrack = document.getElementById('btn-track-paket');
if (btnTrack) {
    btnTrack.addEventListener('click', function () {
        const resi = document.getElementById('track-input').value;
        if (!resi) {
            Swal.fire({
                icon: 'warning',
                title: 'Resi Kosong',
                text: 'Masukkan nomor resi terlebih dahulu'
            });
            return;
        }

        btnTrack.innerText = 'Mencari...';

        fetch('http://localhost/logistikita/index.php?request=api/logistikita/tracking_status&resi=' + resi, {
            method: 'GET'
        })
            .then(res => res.json())
            .then(data => {
                btnTrack.innerText = 'Cari Paket';
                if (data.status === 'success') {
                    Swal.fire({
                        title: `Status Paket ${data.data.resi}`,
                        html: `<b>Penerima:</b> ${data.data.penerima_nama}<br><b>Status:</b> ${data.data.status.toUpperCase()}`,
                        icon: 'info'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Tidak Ditemukan',
                        text: 'Resi tidak ditemukan!'
                    });
                }
            })
            .catch(err => {
                btnTrack.innerText = 'Cari Paket';
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan',
                    text: 'Gagal terhubung ke server'
                });
            });
    });
}

// 3. Form Kirim Paket Baru (Booking)
const bookingForm = document.getElementById('booking-form');

// Auto Calculate Summary
function calculateSummary() {
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });

    const layananSelect = document.getElementById('booking-layanan');
    if (!layananSelect) return;

    const basePrice = parseInt(layananSelect.value);
    const berat = parseFloat(document.getElementById('booking-berat').value) || 1;
    const biaya_ongkir = basePrice * Math.ceil(berat);

    const asuransiCheck = document.getElementById('asuransi').checked;
    const nilaiBarang = parseFloat(document.getElementById('booking-nilai-barang').value) || 0;
    let nilai_asuransi = 0;
    if (asuransiCheck && nilaiBarang > 0) {
        nilai_asuransi = nilaiBarang * 0.005;
    }

    const paymentSelect = document.getElementById('booking-pembayaran').value;
    let service_fee = 0;
    if (paymentSelect === 'smartbank') {
        service_fee = biaya_ongkir * 0.05; // 5% fee via SmartBank
    }

    const total = biaya_ongkir + nilai_asuransi + service_fee;

    document.getElementById('summary-ongkir').innerText = formatter.format(biaya_ongkir);
    document.getElementById('summary-asuransi').innerText = formatter.format(nilai_asuransi);
    document.getElementById('summary-fee').innerText = paymentSelect === 'smartbank' ? formatter.format(service_fee) : 'Rp 0';
    document.getElementById('summary-total').innerText = formatter.format(total);

    const btnSubmit = document.getElementById('btn-submit-booking');
    if (paymentSelect === 'smartbank') {
        btnSubmit.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i> KONFIRMASI & BAYAR VIA SMARTBANK';
        btnSubmit.style.background = 'var(--brand-primary)';
    } else {
        btnSubmit.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i> KONFIRMASI PENGIRIMAN';
        btnSubmit.style.background = 'var(--brand-dark)';
    }
}

if (bookingForm) {
    // Attach event listeners to trigger recalculation
    document.getElementById('booking-layanan').addEventListener('change', calculateSummary);
    document.getElementById('booking-berat').addEventListener('input', calculateSummary);
    document.getElementById('asuransi').addEventListener('change', calculateSummary);
    document.getElementById('booking-nilai-barang').addEventListener('input', calculateSummary);
    document.getElementById('booking-pembayaran').addEventListener('change', calculateSummary);

    // Initial calculation
    calculateSummary();

    bookingForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const btnSubmit = document.getElementById('btn-submit-booking');
        btnSubmit.innerText = 'MEMPROSES...';

        // Ambil data user dari localStorage
        let userId = 3; // Default user_id fallback
        const userSession = localStorage.getItem('user');
        if (userSession) {
            try { userId = JSON.parse(userSession).id; } catch (e) { }
        }

        // Kalkulasi biaya dasar dulu (Simulasi frontend cepat sebelum hitung real backend)
        const layananSelect = document.getElementById('booking-layanan');
        const basePrice = parseInt(layananSelect.value);
        const berat = parseFloat(document.getElementById('booking-berat').value) || 1;
        let biaya_ongkir = basePrice * Math.ceil(berat);

        const asuransiCheck = document.getElementById('asuransi').checked;
        const nilaiBarang = parseFloat(document.getElementById('booking-nilai-barang').value) || 0;
        let nilai_asuransi = 0;
        if (asuransiCheck && nilaiBarang > 0) {
            nilai_asuransi = nilaiBarang * 0.005;
        }
        biaya_ongkir += nilai_asuransi; // Estimasi untuk dikirim

        const payload = {
            user_id: userId,
            pengirim_nama: document.getElementById('booking-pengirim-nama').value,
            pengirim_telp: document.getElementById('booking-pengirim-telp').value,
            pengirim_alamat: document.getElementById('booking-pengirim-alamat').value,
            penerima_nama: document.getElementById('booking-penerima-nama').value,
            penerima_telp: document.getElementById('booking-penerima-telp').value,
            penerima_alamat: document.getElementById('booking-penerima-alamat').value,
            berat: berat,
            layanan: layananSelect.options[layananSelect.selectedIndex].text,
            biaya_ongkir: biaya_ongkir,
            asuransi: asuransiCheck,
            nilai_barang: nilaiBarang
        };

        fetch('http://localhost/logistikita/index.php?request=api/logistikita/request_pengiriman', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                const paymentSelect = document.getElementById('booking-pembayaran').value;
                if (data.status === 'success') {
                    // Jika SmartBank terpilih, otomatis bayar
                    if (paymentSelect === 'smartbank') {
                        fetch('http://localhost/logistikita/index.php?request=api/logistikita/pembayaran_logistik', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pengiriman_id: data.data.pengiriman_id })
                        })
                            .then(r => r.json())
                            .then(payData => {
                                if (payData.status === 'success') {
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Pemesanan Berhasil',
                                        html: `Resi: <b>${data.data.resi}</b><br>Ref: ${payData.data.smartbank_ref}`,
                                        confirmButtonText: 'Mantap!'
                                    }).then(() => {
                                        window.location.reload();
                                    });
                                } else {
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Pemesanan Berhasil, Tapi...',
                                        text: 'Pembayaran SmartBank gagal: ' + payData.message,
                                    }).then(() => {
                                        window.location.reload();
                                    });
                                }
                            });
                    } else {
                        Swal.fire({
                            icon: 'success',
                            title: 'Pemesanan Berhasil',
                            text: `Nomor Resi Anda: ${data.data.resi}`,
                        }).then(() => {
                            window.location.reload();
                        });
                    }
                } else {
                    calculateSummary();
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: data.message
                    });
                }
            })
            .catch(err => {
                calculateSummary();
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan',
                    text: 'Gagal terhubung ke server backend'
                });
            });
    });
}

// 4. Initialize User Data & Fetch Pengiriman
function loadUserData() {
    const userSession = localStorage.getItem('user');
    if (!userSession) {
        window.location.href = 'auth';
        return;
    }

    const user = JSON.parse(userSession);
    const navUserName = document.getElementById('nav-user-name');
    if (navUserName) navUserName.innerText = user.name;

    const navUserRole = document.getElementById('nav-user-role');
    if (navUserRole) navUserRole.innerText = user.role === 'user' ? 'PREMIUM MEMBER' : user.role.toUpperCase();

    const navUserAvatar = document.getElementById('nav-user-avatar');
    if (navUserAvatar) navUserAvatar.innerText = user.name.substring(0, 2).toUpperCase();

    const heroWelcome = document.getElementById('hero-welcome');
    if (heroWelcome) heroWelcome.innerHTML = `Selamat Datang,<br>${user.name}`;

    const pengirimNama = document.getElementById('booking-pengirim-nama');
    if (pengirimNama) pengirimNama.value = user.name;

    // Fetch SmartBank Balance
    fetch(`http://localhost/logistikita/index.php?request=api/smartbank/saldo&email=${user.email}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const balanceFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
                const balanceEl = document.getElementById('smartbank-balance');
                if (balanceEl) {
                    balanceEl.innerText = balanceFormatter.format(data.data.balance);
                }
            }
        })
        .catch(err => console.error("Error fetching balance:", err));

    // Fetch History
    fetch(`http://localhost/logistikita/index.php?request=api/logistikita/daftar_pengiriman&type=user&user_id=${user.id}`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                const pengiriman = data.data;
                const historyContainer = document.getElementById('history-cards-container');
                const activeContainer = document.getElementById('active-status-container');

                if (historyContainer) historyContainer.innerHTML = '';
                if (activeContainer) activeContainer.innerHTML = '';

                let hasActive = false;

                if (pengiriman.length === 0) {
                    if (historyContainer) {
                        historyContainer.innerHTML = `
                            <div style="background-color: var(--gray-50); border-radius: 20px; padding: 32px; margin-bottom: 24px; border: 1px solid var(--gray-100);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                                    <div>
                                        <h4 style="font-size: 1.2rem; font-weight: 800; color: var(--brand-dark);">LKT-H9X7Y2</h4>
                                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Menuju: Budi Santoso (Jl. Sudirman No...)</p>
                                    </div>
                                    <span class="status-badge delivered">SELESAI</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                                    <i class="fas fa-box-open" style="font-size: 2rem; color: #10b981;"></i>
                                    <div>
                                        <p style="font-weight: 700;">Paket dalam status: Selesai</p>
                                        <p style="font-size: 0.8rem; color: var(--text-secondary);">Dibuat: 11 Mei 2026</p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 12px; border-top: 1px dashed var(--gray-100); padding-top: 20px;">
                                    <button onclick="openHistoryDetail('LKT-H9X7Y2')" style="flex: 1; padding: 12px; border: 1px solid var(--brand-primary); background: white; color: var(--brand-primary); border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--brand-primary)'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='var(--brand-primary)'"><i class="fas fa-map-marked-alt"></i> Peta & Detail Riwayat</button>
                                    <button onclick="openHistoryDetail('LKT-H9X7Y2'); setTimeout(() => { document.getElementById('custom-tip-amount').focus(); }, 500);" style="flex: 1; padding: 12px; border: none; background: #10b981; color: white; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fas fa-hand-holding-dollar"></i> Beri Tip Kurir</button>
                                </div>
                            </div>
                        `;
                    }
                    if (activeContainer) activeContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">Tidak ada pengiriman aktif</p>';
                    return;
                }

                pengiriman.forEach(item => {
                    // Table row
                    const dateObj = new Date(item.created_at);
                    const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('id-ID', { month: 'short' })} ${dateObj.getFullYear()}`;

                    let badgeClass = 'transit';
                    if (item.status === 'delivered') badgeClass = 'delivered';
                    else if (item.status === 'pending') badgeClass = 'processing';

                    if (historyContainer && item.status === 'delivered') {
                        historyContainer.innerHTML += `
                            <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; this.style.borderColor='#e2e8f0'">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                                    <div>
                                        <div style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">Nomor Resi</div>
                                        <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                            ${item.resi}
                                            <i class="fas fa-copy" style="font-size: 0.9rem; color: #94a3b8; cursor: pointer;" title="Salin Resi"></i>
                                        </h3>
                                    </div>
                                    <span style="background: #10b98115; color: #10b981; border: 1px solid #10b98140; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px;">
                                        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                                        SELESAI
                                    </span>
                                </div>
                                
                                <div style="display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; gap: 12px;">
                                            <div style="margin-top: 2px;">
                                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">
                                                    <i class="fas fa-user"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Penerima</p>
                                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${item.penerima_nama}</p>
                                                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #475569; line-height: 1.4;">${item.penerima_alamat.substring(0, 30)}...</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style="width: 1px; background: #e2e8f0;"></div>
                                    
                                    <div style="flex: 1;">
                                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                                                <i class="fas fa-truck-fast"></i>
                                            </div>
                                            <div>
                                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Layanan</p>
                                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${item.nama_layanan || item.layanan_id || 'Reguler'}</p>
                                            </div>
                                        </div>
                                        <div style="display: flex; gap: 12px;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                                                <i class="fas fa-weight-hanging"></i>
                                            </div>
                                            <div>
                                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Dibuat</p>
                                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${dateStr}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="display: flex; gap: 12px;">
                                    <button onclick="openDetailModal('${item.resi}')" style="flex: 1; padding: 12px; border: 1px solid #3b82f6; background: white; color: #3b82f6; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#3b82f6'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#3b82f6'"><i class="fas fa-map-marked-alt"></i> Peta & Detail Riwayat</button>
                                    <button onclick="showTipDialog('${item.resi}')" style="flex: 1; padding: 12px; border: none; background: #10b981; color: white; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fas fa-hand-holding-dollar"></i> Beri Tip Kurir</button>
                                </div>
                            </div>
                        `;
                    }

                    // Active Cards
                    if (item.status !== 'delivered') {
                        hasActive = true;
                        let icon = 'fa-boxes';
                        if (item.status === 'transit') icon = 'fa-truck-fast';

                        if (activeContainer) {
                            activeContainer.innerHTML += `
                                <div style="background-color: var(--gray-50); border-radius: 20px; padding: 32px; margin-bottom: 24px; border: 1px solid var(--gray-100);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                                        <div>
                                            <h4 style="font-size: 1.2rem; font-weight: 800; color: var(--brand-dark);">${item.resi}</h4>
                                            <p style="color: var(--text-secondary); font-size: 0.9rem;">Menuju: ${item.penerima_nama} (${item.penerima_alamat.substring(0, 15)}...)</p>
                                        </div>
                                        <span class="status-badge ${badgeClass}">${item.status.toUpperCase()}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 16px;">
                                        <i class="fas ${icon}" style="font-size: 2rem; color: var(--brand-primary);"></i>
                                        <div>
                                            <p style="font-weight: 700;">Paket dalam status: ${item.status.replace('_', ' ')}</p>
                                            <p style="font-size: 0.8rem; color: var(--text-secondary);">Dibuat: ${dateStr}</p>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                });

                if (!hasActive && activeContainer) {
                    activeContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">Tidak ada pengiriman aktif</p>';
                }
            } else {
                // If API returns error (e.g. no shipments), show dummy data
                const historyContainer = document.getElementById('history-cards-container');
                const activeContainer = document.getElementById('active-status-container');
                if (historyContainer) {
                    historyContainer.innerHTML = `
                        <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; this.style.borderColor='#e2e8f0'">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                                <div>
                                    <div style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">Nomor Resi</div>
                                    <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                        LKT-H9X7Y2
                                        <i class="fas fa-copy" style="font-size: 0.9rem; color: #94a3b8; cursor: pointer;" title="Salin Resi"></i>
                                    </h3>
                                </div>
                                <span style="background: #10b98115; color: #10b981; border: 1px solid #10b98140; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px;">
                                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                                    SELESAI
                                </span>
                            </div>
                            
                            <div style="display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
                                <div style="flex: 1;">
                                    <div style="display: flex; gap: 12px;">
                                        <div style="margin-top: 2px;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">
                                                <i class="fas fa-user"></i>
                                            </div>
                                        </div>
                                        <div>
                                            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Penerima</p>
                                            <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">Budi Santoso</p>
                                            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #475569; line-height: 1.4;">Jl. Sudirman No. 10...</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="width: 1px; background: #e2e8f0;"></div>
                                
                                <div style="flex: 1;">
                                    <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                                            <i class="fas fa-truck-fast"></i>
                                        </div>
                                        <div>
                                            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Layanan</p>
                                            <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">Cargo</p>
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: 12px;">
                                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                                            <i class="fas fa-weight-hanging"></i>
                                        </div>
                                        <div>
                                            <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Berat</p>
                                            <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">5.0 kg</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 12px;">
                                <button onclick="openDetailModal('LKT-H9X7Y2')" style="flex: 1; padding: 12px; border: 1px solid #3b82f6; background: white; color: #3b82f6; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#3b82f6'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#3b82f6'"><i class="fas fa-map-marked-alt"></i> Peta & Detail Riwayat</button>
                                <button onclick="showTipDialog('LKT-H9X7Y2')" style="flex: 1; padding: 12px; border: none; background: #10b981; color: white; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fas fa-hand-holding-dollar"></i> Beri Tip Kurir</button>
                            </div>
                        </div>
                    `;
                }
                if (activeContainer) activeContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">Tidak ada pengiriman aktif</p>';
            }
        })
        .catch(err => {
            console.error('Error fetching delivery data:', err);
            // Fallback to dummy data on network error
            const historyContainer = document.getElementById('history-cards-container');
            const activeContainer = document.getElementById('active-status-container');
            if (historyContainer) {
                historyContainer.innerHTML = `
                    <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; this.style.borderColor='#e2e8f0'">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                            <div>
                                <div style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">Nomor Resi</div>
                                <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                                    LKT-H9X7Y2
                                    <i class="fas fa-copy" style="font-size: 0.9rem; color: #94a3b8; cursor: pointer;" title="Salin Resi"></i>
                                </h3>
                            </div>
                            <span style="background: #10b98115; color: #10b981; border: 1px solid #10b98140; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px;">
                                <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                                SELESAI
                            </span>
                        </div>
                        
                        <div style="display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
                            <div style="flex: 1;">
                                <div style="display: flex; gap: 12px;">
                                    <div style="margin-top: 2px;">
                                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">
                                            <i class="fas fa-user"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Penerima</p>
                                        <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">Budi Santoso</p>
                                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #475569; line-height: 1.4;">Jl. Sudirman No. 10...</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="width: 1px; background: #e2e8f0;"></div>
                            
                            <div style="flex: 1;">
                                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                                        <i class="fas fa-truck-fast"></i>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Layanan</p>
                                        <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">Cargo</p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 12px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                                        <i class="fas fa-weight-hanging"></i>
                                    </div>
                                    <div>
                                        <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Berat</p>
                                        <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">5.0 kg</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 12px;">
                            <button onclick="openDetailModal('LKT-H9X7Y2')" style="flex: 1; padding: 12px; border: 1px solid #3b82f6; background: white; color: #3b82f6; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#3b82f6'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#3b82f6'"><i class="fas fa-map-marked-alt"></i> Peta & Detail Riwayat</button>
                            <button onclick="showTipDialog('LKT-H9X7Y2')" style="flex: 1; padding: 12px; border: none; background: #10b981; color: white; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fas fa-hand-holding-dollar"></i> Beri Tip Kurir</button>
                        </div>
                    </div>
                `;
            }
            if (activeContainer) activeContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-secondary);">Tidak ada pengiriman aktif</p>';
        });
}

const dummyShipments = [
    {
        resi: "LKT-A8F9K2",
        penerima_nama: "Rian Hidayat",
        penerima_alamat: "Jl. Merdeka No. 45, Bandung, Jawa Barat",
        berat: "2.5 kg",
        layanan: "Reguler",
        status: "transit",
        riwayat: [
            { status: "Pending", lokasi: "Sistem", waktu_update: "2026-05-19 01:10", lat: -6.200000, lng: 106.816666 },
            { status: "Menunggu Pickup", lokasi: "Gudang Penjual (Jakarta)", waktu_update: "2026-05-19 01:15", lat: -6.21462, lng: 106.84513 },
            { status: "Transit", lokasi: "Hub Transit (Cikarang)", waktu_update: "2026-05-19 14:30", lat: -6.3475, lng: 107.1955 },
            { status: "Transit", lokasi: "Menuju Bandung (KM 72)", waktu_update: "2026-05-19 18:30", lat: -6.5361, lng: 107.4336 } // Koordinat Toll Cipularang
        ],
        tujuan_lat: -6.914744,
        tujuan_lng: 107.609810
    },
    {
        resi: "LKT-B4C2M9",
        penerima_nama: "Siti Aminah",
        penerima_alamat: "Perumahan Indah Blok C2, Surabaya, Jawa Timur",
        berat: "1.2 kg",
        layanan: "Express",
        status: "menunggu pickup",
        riwayat: [
            { status: "Pending", lokasi: "Sistem", waktu_update: "2026-05-20 08:00", lat: -6.914744, lng: 107.609810 },
            { status: "Menunggu Pickup", lokasi: "Distributor Sepatu (Bandung)", waktu_update: "2026-05-20 08:05", lat: -6.914744, lng: 107.609810 }
        ],
        tujuan_lat: -7.250445,
        tujuan_lng: 112.768845
    }
];

let currentActiveResi = null;
let leafletMap = null;
let mapMarkers = [];
let polylineLayer = null;

function renderDashboard(data) {
    const listContainer = document.getElementById('active-status-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    data.forEach(shipment => {
        let badgeColor = '#6b7280';
        if (shipment.status === 'delivered') badgeColor = '#10b981';
        else if (shipment.status === 'transit') badgeColor = '#3b82f6';
        else if (shipment.status === 'menunggu pickup') badgeColor = '#f59e0b';

        const cardHTML = `
            <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; this.style.borderColor='#cbd5e1'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'; this.style.borderColor='#e2e8f0'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <div style="color: #64748b; font-size: 0.75rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">Nomor Resi</div>
                        <h3 style="margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            ${shipment.resi}
                            <i class="fas fa-copy" style="font-size: 0.9rem; color: #94a3b8; cursor: pointer;" title="Salin Resi"></i>
                        </h3>
                    </div>
                    <span style="background: ${badgeColor}15; color: ${badgeColor}; border: 1px solid ${badgeColor}40; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${badgeColor}; display: inline-block;"></span>
                        ${shipment.status}
                    </span>
                </div>
                
                <div style="display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
                    <div style="flex: 1;">
                        <div style="display: flex; gap: 12px;">
                            <div style="margin-top: 2px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #64748b;">
                                    <i class="fas fa-user"></i>
                                </div>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Penerima</p>
                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${shipment.penerima_nama}</p>
                                <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #475569; line-height: 1.4;">${shipment.penerima_alamat}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="width: 1px; background: #e2e8f0;"></div>
                    
                    <div style="flex: 1;">
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                                <i class="fas fa-truck-fast"></i>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Layanan</p>
                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${shipment.layanan}</p>
                            </div>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #ef4444;">
                                <i class="fas fa-weight-hanging"></i>
                            </div>
                            <div>
                                <p style="margin: 0; font-size: 0.85rem; color: #64748b;">Berat</p>
                                <p style="margin: 2px 0 0 0; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${shipment.berat}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="openDetailModal('${shipment.resi}')" style="cursor: pointer; padding: 10px 20px; background-color: white; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 8px; font-weight: 700; font-size: 0.9rem; transition: all 0.2s;" onmouseover="this.style.background='#3b82f6'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#3b82f6'">
                        Lihat Detail <i class="fas fa-arrow-right" style="margin-left: 6px; font-size: 0.8rem;"></i>
                    </button>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function getCoordinatesForLocation(lokasi) {
    const loc = lokasi.toLowerCase();
    if (loc.includes('jakarta') || loc.includes('sistem') || loc.includes('hq') || loc.includes('jkt')) {
        return { lat: -6.2088, lng: 106.8456 };
    } else if (loc.includes('cikarang')) {
        return { lat: -6.3475, lng: 107.1955 };
    } else if (loc.includes('surabaya') || loc.includes('sby')) {
        return { lat: -7.2504, lng: 112.7688 };
    } else if (loc.includes('bandung') || loc.includes('bdg')) {
        return { lat: -6.9175, lng: 107.6191 };
    } else {
        // Fallback: acak teratur sekitar Bandung/Jakarta
        return { lat: -6.5 + (Math.random() - 0.5) * 0.2, lng: 107.5 + (Math.random() - 0.5) * 0.2 };
    }
}

function openDetailModal(resi) {
    const userSession = localStorage.getItem('user');
    if (!userSession) return;
    const user = JSON.parse(userSession);

    Swal.fire({
        title: 'Memuat...',
        text: 'Mengambil riwayat tracking dari database...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch('http://localhost/logistikita/index.php?request=api/logistikita/tracking_status&resi=' + resi)
        .then(res => res.json())
        .then(data => {
            Swal.close();
            if (data.status === 'success') {
                const shipment = data.data;
                currentActiveResi = shipment.resi;

                document.getElementById('modal-resi').textContent = shipment.resi;
                document.getElementById('modal-penerima').textContent = shipment.penerima_nama;
                document.getElementById('modal-alamat').textContent = shipment.penerima_alamat;
                document.getElementById('modal-berat').textContent = shipment.berat + ' kg';
                document.getElementById('modal-layanan').textContent = shipment.nama_layanan || 'Reguler';

                const cancelBtn = document.getElementById('btn-cancel-order');
                if (cancelBtn) {
                    if (shipment.status === 'pending' || shipment.status === 'menunggu_pickup') {
                        cancelBtn.style.display = 'block';
                    } else {
                        cancelBtn.style.display = 'none';
                    }
                }

                const timelineContainer = document.getElementById('modal-timeline');
                if (timelineContainer) {
                    timelineContainer.innerHTML = '';
                    
                    if (!shipment.riwayat || shipment.riwayat.length === 0) {
                        timelineContainer.innerHTML = '<p style="color:#64748b; padding: 10px; text-align:center;">Belum ada riwayat update.</p>';
                    } else {
                        shipment.riwayat.forEach((log, index) => {
                            const isLast = index === 0; // Karena terurut DESC (terbaru di atas)
                            const isFirst = index === shipment.riwayat.length - 1;
                            const timelineNodeHTML = `
                                <div style="position: relative; padding-left: 28px; padding-bottom: ${isFirst ? '0' : '24px'}; text-align: left;">
                                    ${!isFirst ? '<div style="position: absolute; left: 6px; top: 20px; bottom: 0; width: 2px; background-color: #e2e8f0;"></div>' : ''}
                                    
                                    <div style="position: absolute; left: 0; top: 4px; width: 14px; height: 14px; background-color: white; border: 3px solid #3b82f6; border-radius: 50%; z-index: 10;"></div>
                                    
                                    <div style="background: ${index === 0 ? '#eff6ff' : 'transparent'}; padding: ${index === 0 ? '12px' : '0'}; border-radius: 8px; border: ${index === 0 ? '1px solid #bfdbfe' : 'none'};">
                                        <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: #0f172a;">${log.status.toUpperCase()}</h4>
                                        <div style="display: flex; flex-direction: column; gap: 4px;">
                                            <span style="font-size: 0.85rem; color: #475569; display: flex; align-items: center; gap: 6px;">
                                                <i class="fas fa-map-marker-alt" style="color: #94a3b8; width: 14px; text-align: center;"></i> ${log.lokasi}
                                            </span>
                                            <span style="font-size: 0.85rem; color: #64748b; font-weight: 600; display: block; margin-top: 2px;">
                                                ${log.keterangan}
                                            </span>
                                            <span style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
                                                <i class="far fa-clock" style="color: #94a3b8; width: 14px; text-align: center;"></i> ${log.waktu_update}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `;
                            timelineContainer.insertAdjacentHTML('beforeend', timelineNodeHTML);
                        });
                    }
                }

                // Switch to Full Page Tab
                const panes = document.querySelectorAll('.tab-pane');
                panes.forEach(p => p.classList.remove('active'));
                const detailTab = document.getElementById('tracking-detail');
                if (detailTab) {
                    detailTab.classList.add('active');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                }

                // LEAFLET MAP INITIALIZATION
                if (typeof L !== 'undefined' && shipment.riwayat && shipment.riwayat.length > 0) {
                    const mappedRiwayat = shipment.riwayat.map(h => {
                        const coords = getCoordinatesForLocation(h.lokasi);
                        return { ...h, lat: coords.lat, lng: coords.lng };
                    }).reverse();

                    const lastHistory = mappedRiwayat[mappedRiwayat.length - 1];
                    const firstHistory = mappedRiwayat[0];
                    const destCoords = getCoordinatesForLocation(shipment.penerima_alamat);

                    if (!leafletMap) {
                        leafletMap = L.map('leaflet-map').setView([lastHistory.lat, lastHistory.lng], 10);
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                            maxZoom: 19
                        }).addTo(leafletMap);
                    } else {
                        leafletMap.setView([lastHistory.lat, lastHistory.lng], 10);
                        mapMarkers.forEach(m => leafletMap.removeLayer(m));
                        mapMarkers = [];
                        if (polylineLayer) {
                            leafletMap.removeControl(polylineLayer);
                            polylineLayer = null;
                        }
                    }

                    setTimeout(() => {
                        leafletMap.invalidateSize();
                    }, 100);

                    const originIcon = L.divIcon({
                        html: '<div style="background:#f59e0b; color:white; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%; box-shadow:0 4px 6px rgba(0,0,0,0.3); border:2px solid white;"><i class="fas fa-warehouse"></i></div>',
                        className: '', iconSize: [36, 36], iconAnchor: [18, 18]
                    });

                    const destIcon = L.divIcon({
                        html: '<div style="background:#10b981; color:white; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%; box-shadow:0 4px 6px rgba(0,0,0,0.3); border:2px solid white;"><i class="fas fa-home"></i></div>',
                        className: '', iconSize: [36, 36], iconAnchor: [18, 18]
                    });

                    const truckIcon = L.divIcon({
                        html: '<div style="background:#3b82f6; color:white; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; box-shadow:0 6px 10px rgba(0,0,0,0.4); border:3px solid white; animation: pulse 2s infinite;"><i class="fas fa-truck-fast"></i></div>',
                        className: '', iconSize: [44, 44], iconAnchor: [22, 22]
                    });

                    const waypoints = mappedRiwayat.map(h => L.latLng(h.lat, h.lng));
                    if (shipment.status !== 'delivered') {
                        waypoints.push(L.latLng(destCoords.lat, destCoords.lng));
                    }

                    const latlngs = waypoints.map(wp => [wp.lat, wp.lng]);
                    polylineLayer = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '10, 10' }).addTo(leafletMap);
                    
                    try {
                        leafletMap.fitBounds(polylineLayer.getBounds(), { padding: [50, 50] });
                    } catch(e) {}

                    const mOrigin = L.marker([firstHistory.lat, firstHistory.lng], { icon: originIcon, zIndexOffset: 100 })
                        .bindPopup(`<b>Asal:</b> ${firstHistory.lokasi}`).addTo(leafletMap);
                    mapMarkers.push(mOrigin);

                    if (shipment.status !== 'delivered') {
                        const mDest = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon, zIndexOffset: 100 })
                            .bindPopup(`<b>Tujuan:</b> ${shipment.penerima_alamat}`).addTo(leafletMap);
                        mapMarkers.push(mDest);
                    }

                    const mTruck = L.marker([lastHistory.lat, lastHistory.lng], { icon: truckIcon, zIndexOffset: 1000 })
                        .bindPopup(`<b>Posisi Terkini:</b> ${lastHistory.lokasi}<br>Status: ${lastHistory.status.toUpperCase()}`).addTo(leafletMap);
                    mapMarkers.push(mTruck);
                    mTruck.openPopup();
                }
            } else {
                Swal.fire('Gagal', 'Gagal memuat status pengiriman: ' + data.message, 'error');
            }
        })
        .catch(err => {
            Swal.close();
            Swal.fire('Kesalahan', 'Gagal mengambil data dari server.', 'error');
        });
}

function closeDetailModal() {
    backToStatus();
}

function backToStatus() {
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(p => p.classList.remove('active'));
    document.getElementById('status').classList.add('active');

    const tabs = document.querySelectorAll('.hub-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const statusTab = document.querySelector('.hub-tab[data-target="status"]');
    if (statusTab) statusTab.classList.add('active');

    currentActiveResi = null;
}

function cancelOrder() {
    if (!currentActiveResi) return;
    
    const userSession = localStorage.getItem('user');
    if (!userSession) return;
    const user = JSON.parse(userSession);
    
    Swal.fire({
        title: 'Batalkan Pengiriman?',
        text: 'Apakah Anda yakin ingin membatalkan pengiriman dengan resi ' + currentActiveResi + '? Saldo Anda akan dikembalikan (refund) via SmartBank.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Ya, Batalkan!',
        cancelButtonText: 'Kembali'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Memproses...',
                text: 'Membatalkan pesanan dan mengurus refund SmartBank...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            
            fetch('http://localhost/logistikita/index.php?request=api/logistikita/batalkan_pengiriman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resi: currentActiveResi, email: user.email })
            })
            .then(res => res.json())
            .then(data => {
                Swal.close();
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil Dibatalkan',
                        text: data.message,
                        confirmButtonColor: '#10b981'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Membatalkan',
                        text: data.message,
                        confirmButtonColor: '#ef4444'
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

function openHistoryDetail(resi) {
    openDetailModal(resi);
}

function showTipDialog(resi) {
    const formatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
    
    Swal.fire({
        title: '<h3 style="font-weight: 800; color: #1e293b; margin-top: 10px; font-size: 1.5rem;">Beri Tip Kurir</h3>',
        html: `
            <div style="text-align: center; margin-bottom: 10px; margin-top: 10px;">
                <div style="width: 80px; height: 80px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-motorcycle" style="font-size: 2.2rem; color: #10b981;"></i>
                </div>
                <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
                    Apresiasi kerja keras kurir yang telah mengantarkan paket <strong>${resi}</strong> dengan aman sampai ke tujuan.
                </p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
                    <button type="button" class="tip-btn" data-val="5000" style="padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; font-weight: 700; font-size: 1rem; color: #475569; cursor: pointer; transition: all 0.2s;">Rp 5.000</button>
                    <button type="button" class="tip-btn" data-val="10000" style="padding: 14px 10px; border: 2px solid #10b981; border-radius: 12px; background: #10b98115; font-weight: 700; font-size: 1rem; color: #10b981; cursor: pointer; transition: all 0.2s;">Rp 10.000</button>
                    <button type="button" class="tip-btn" data-val="20000" style="padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; font-weight: 700; font-size: 1rem; color: #475569; cursor: pointer; transition: all 0.2s;">Rp 20.000</button>
                    <button type="button" class="tip-btn" data-val="50000" style="padding: 14px 10px; border: 2px solid #e2e8f0; border-radius: 12px; background: white; font-weight: 700; font-size: 1rem; color: #475569; cursor: pointer; transition: all 0.2s;">Rp 50.000</button>
                </div>

                <div style="text-align: left;">
                    <label style="font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; display: block;">Atau masukkan nominal lain</label>
                    <div style="position: relative;">
                        <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-weight: 700; font-size: 1.1rem;">Rp</span>
                        <input type="number" id="custom-tip-input" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box; padding-left: 50px; border-radius: 12px; border: 2px solid #e2e8f0; font-weight: 700; font-size: 1.1rem; color: #1e293b; box-shadow: none;" value="10000" min="1000" step="1000">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-heart" style="margin-right: 6px;"></i> Kirim Tip Sekarang',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#f1f5f9',
        customClass: {
            cancelButton: 'swal-cancel-btn',
            popup: 'premium-swal-popup'
        },
        didOpen: () => {
            const btns = document.querySelectorAll('.tip-btn');
            const input = document.getElementById('custom-tip-input');
            const cancelBtn = Swal.getCancelButton();
            if(cancelBtn) {
                cancelBtn.style.color = '#475569';
                cancelBtn.style.fontWeight = '700';
            }
            
            btns.forEach(btn => {
                btn.addEventListener('mouseover', () => {
                    if (input.value !== btn.getAttribute('data-val')) {
                        btn.style.borderColor = '#cbd5e1';
                        btn.style.background = '#f8fafc';
                    }
                });
                btn.addEventListener('mouseout', () => {
                    if (input.value !== btn.getAttribute('data-val')) {
                        btn.style.borderColor = '#e2e8f0';
                        btn.style.background = 'white';
                    }
                });
                btn.addEventListener('click', () => {
                    btns.forEach(b => {
                        b.style.borderColor = '#e2e8f0';
                        b.style.background = 'white';
                        b.style.color = '#475569';
                    });
                    btn.style.borderColor = '#10b981';
                    btn.style.background = '#10b98115';
                    btn.style.color = '#10b981';
                    input.value = btn.getAttribute('data-val');
                });
            });

            input.addEventListener('input', () => {
                const val = input.value;
                btns.forEach(b => {
                    if (b.getAttribute('data-val') === val) {
                        b.style.borderColor = '#10b981';
                        b.style.background = '#10b98115';
                        b.style.color = '#10b981';
                    } else {
                        b.style.borderColor = '#e2e8f0';
                        b.style.background = 'white';
                        b.style.color = '#475569';
                    }
                });
            });
        },
        preConfirm: () => {
            const val = document.getElementById('custom-tip-input').value;
            if (!val || parseInt(val) < 1000) {
                Swal.showValidationMessage('Masukkan nominal tip minimal Rp 1.000');
                return false;
            }
            return parseInt(val);
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const userSession = localStorage.getItem('user');
            if (!userSession) return;
            const user = JSON.parse(userSession);

            Swal.fire({
                title: '<h3 style="font-weight: 800; color: #1e293b; margin-top: 10px;">Memproses...</h3>',
                text: 'Memproses pembayaran tip via SmartBank...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            fetch('http://localhost/logistikita/index.php?request=api/logistikita/beri_tip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resi: resi, amount: result.value, email: user.email })
            })
            .then(res => res.json())
            .then(data => {
                Swal.close();
                if (data.status === 'success') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Transaksi Berhasil!',
                        html: `
                            <div style="margin-top: 5px;">
                                <p style="color: #475569; font-size: 1.05rem; line-height: 1.6; margin-bottom: 24px;">
                                    Terima kasih banyak atas apresiasi Anda!<br>
                                    Tip sebesar <strong style="color: #10b981; font-size: 1.2rem;">${formatter.format(result.value)}</strong> telah diteruskan ke saldo kurir.
                                </p>
                            </div>
                        `,
                        confirmButtonColor: '#10b981',
                        confirmButtonText: 'Selesai'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Pembayaran Gagal',
                        text: data.message,
                        confirmButtonColor: '#ef4444'
                    });
                }
            })
            .catch(err => {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan Jaringan',
                    text: 'Gagal terhubung ke server.',
                    confirmButtonColor: '#ef4444'
                });
            });
        }
    });
}

function backToHistoryList() {
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(p => p.classList.remove('active'));

    // Pastikan ID tab riwayat di file HTML kamu sesuai, misal id="history"
    const historyTab = document.getElementById('history');
    if (historyTab) historyTab.classList.add('active');

    window.scrollTo({ top: 300, behavior: 'smooth' });
}