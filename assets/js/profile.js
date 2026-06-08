// Interactive Tab Switching Logic for Profile Tabs
const headerTabs = document.querySelectorAll('.header-tab');
const panes = document.querySelectorAll('.pane');

// Mobile Sidebar Logic
const hamburgerBtn = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
    sidebar.classList.add('active');
    sidebarOverlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

// Tab Switching
headerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Determine target pane
        const targetPaneId = tab.getAttribute('data-target');

        // Synchronize active state across *all* instances of the tab (desktop & mobile)
        headerTabs.forEach(t => {
            if (t.getAttribute('data-target') === targetPaneId) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Switch panes
        panes.forEach(p => p.classList.remove('active'));
        document.getElementById(targetPaneId).classList.add('active');

        // Close sidebar automatically if open
        closeSidebar();
    });
});

// Initialize User Data from LocalStorage
function loadUserData() {
    const userSession = localStorage.getItem('user');
    if(!userSession) {
        window.location.href = 'auth';
        return;
    }
    
    const user = JSON.parse(userSession);
    
    // Sidebar Data
    const navUserName = document.getElementById('nav-user-name');
    const navUserRole = document.getElementById('nav-user-role');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    
    if(navUserName) navUserName.innerText = user.name;
    if(navUserRole) navUserRole.innerText = user.role === 'user' ? 'PREMIUM MEMBER' : user.role.toUpperCase();
    if(navUserAvatar) navUserAvatar.innerText = user.name.substring(0, 2).toUpperCase();
    
    // Profile Header Data
    const profileName = document.getElementById('profile-user-name');
    const profileRole = document.getElementById('profile-user-role');
    const profileAvatar = document.getElementById('profile-avatar-glow');
    
    if(profileName) profileName.innerText = user.name;
    if(profileRole) profileRole.innerHTML = user.role === 'user' ? '<i class="fas fa-crown"></i> PREMIUM MEMBER' : '<i class="fas fa-shield-halved"></i> ' + user.role.toUpperCase();
    if(profileAvatar) profileAvatar.innerText = user.name.substring(0, 2).toUpperCase();

    // Profile Form Data
    const inputName = document.getElementById('profile-input-name');
    const inputEmail = document.getElementById('profile-input-email');
    
    if(inputName) inputName.value = user.name;
    if(inputEmail) {
        // Generate a mockup email based on username if email doesn't exist
        inputEmail.value = user.email || (user.name.toLowerCase().replace(/\s+/g, '.') + '@logistikita.com');
    }
}

// Run on load
loadUserData();
