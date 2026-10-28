// Navigation Sidebar & Topbar Shell Component
import { getEmployeeSession, clearEmployeeSession, getEmployeeRole } from '../auth.js';
import { navigateTo } from '../router.js';
import { initOnlineIndicator } from './online-indicator.js';
import { confirmDialog } from './modal.js';
import { getCurrentTheme, toggleTheme } from '../helpers/theme-helper.js';
import { toast } from './toast.js';
import * as caisseRepo from '../db/repositories/caisse-repo.js';

export function renderLayout(pageContainer) {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const employee = getEmployeeSession() || { nom: "Utilisateur", prenom: "", role: 1 };
    const role = Number(employee.role || 1);

    const roleName = role === 3 ? "Administrateur" : 
                     role === 2 ? "Gérant" : "Caissier";

    const layout = document.createElement('div');
    layout.className = 'app-layout';

    layout.innerHTML = `
        <!-- Left Sidebar Navigation -->
        <aside class="sidebar">
            <div class="sidebar-header flex flex-between items-center p-4 border-b">
                <div class="flex items-center gap-2">
                    <div class="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="20" height="20" rx="3"/>
                            <line x1="2" y1="10" x2="22" y2="10"/>
                            <line x1="12" y1="2" x2="12" y2="10"/>
                        </svg>
                    </div>
                    <span class="font-bold text-lg text-primary tracking-wide">Caisse 2.0</span>
                </div>
            </div>

            <!-- Employee Info badge -->
            <div class="p-3 mx-3 my-2 card flex items-center gap-3">
                <div class="avatar-circle font-bold text-accent">
                    ${(employee.prenom?.[0] || employee.nom?.[0] || 'U').toUpperCase()}
                </div>
                <div class="overflow-hidden">
                    <div class="font-semibold text-sm truncate">${employee.prenom || ''} ${employee.nom || ''}</div>
                    <div class="badge badge-accent text-xs">${roleName}</div>
                </div>
            </div>

            <!-- Nav Links according to Role -->
            <nav class="sidebar-nav p-2 flex-1 overflow-y-auto">
                <p class="text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2">Vente</p>
                <a href="#/caisse" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/caisse">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    <span>Caisse Scanner</span>
                </a>
                <a href="#/caisse-touch" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/caisse-touch">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>
                    <span>Caisse Tactile</span>
                </a>
                <a href="#/factures" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/factures">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span>Factures & Ventes</span>
                </a>

                ${role >= 2 ? `
                <p class="text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2 mt-3">Gestion</p>
                <a href="#/produits" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/produits">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    <span>Articles & Stock</span>
                </a>
                <a href="#/fournisseurs" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/fournisseurs">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    <span>Fournisseurs</span>
                </a>
                ` : ''}

                ${role >= 3 ? `
                <p class="text-xs font-semibold text-muted uppercase tracking-wider px-3 py-2 mt-3">Administration</p>
                <a href="#/employes" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/employes">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>Personnel / Employés</span>
                </a>
                <a href="#/parametres" class="nav-item flex items-center gap-3 p-3 radius-md text-secondary hover:text-white" data-route="#/parametres">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Paramètres & Clôture</span>
                </a>
                ` : ''}
            </nav>

            <!-- Logout button in sidebar footer -->
            <div class="sidebar-footer p-3 border-t">
                <button type="button" class="btn btn-ghost w-full flex items-center gap-2 text-danger btn-logout">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Déconnexion</span>
                </button>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content flex flex-col flex-1">
            <header class="main-header flex flex-between items-center px-4 py-3 border-b bg-card">
                <div class="flex items-center gap-3">
                    <button type="button" class="btn btn-ghost btn-sm btn-mobile-menu" aria-label="Afficher ou masquer le menu" aria-expanded="true">☰</button>
                    <div class="header-brand">
                        <h1 class="page-current-title font-semibold text-lg">Caisse 2.0</h1>
                        <button type="button" class="header-theme-toggle" role="switch" aria-label="Mode sombre">
                            <span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-thumb"></span></span>
                            <span class="theme-toggle-label">Mode sombre</span>
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="online-indicator-slot"></div>
                    <div class="live-clock font-mono text-sm text-secondary"></div>
                </div>
            </header>

            <div class="page-slot flex-1 overflow-y-auto p-4"></div>
        </main>
    `;

    // Clock
    const clockEl = layout.querySelector('.live-clock');
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('fr-FR');
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Online indicator
    initOnlineIndicator(layout.querySelector('.online-indicator-slot'));

    // Theme toggle
    const themeToggle = layout.querySelector('.header-theme-toggle');
    const themeToggleLabel = themeToggle.querySelector('.theme-toggle-label');
    const updateThemeToggle = () => {
        const isDark = getCurrentTheme() === 'dark';
        themeToggle.setAttribute('aria-checked', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Mode sombre' : 'Mode clair');
        themeToggleLabel.textContent = isDark ? 'Mode sombre' : 'Mode clair';
    };
    updateThemeToggle();
    themeToggle.addEventListener('click', async () => {
        themeToggle.disabled = true;
        try {
            await toggleTheme();
            updateThemeToggle();
        } catch (err) {
            console.error('[Theme] Unable to switch theme:', err);
            toast.error("Impossible de modifier le thème.");
        } finally {
            themeToggle.disabled = false;
        }
    });

    // Highlight active link
    const currentHash = window.location.hash || '#/caisse';
    layout.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('href') === currentHash) {
            item.classList.add('active');
        }
    });

    // Logout
    layout.querySelector('.btn-logout').addEventListener('click', async () => {
        const ok = await confirmDialog("Voulez-vous fermer la session de travail ?", "Déconnexion");
        if (ok) {
            await caisseRepo.recordDisconnection(employee.cin);
            clearEmployeeSession();
            navigateTo('#/login');
        }
    });

    // Mobile sidebar toggle
    const sidebar = layout.querySelector('.sidebar');
    const mobileBtn = layout.querySelector('.btn-mobile-menu');

    const toggleSidebar = () => {
        const isExpanded = sidebar.classList.toggle('sidebar-hidden') === false;
        mobileBtn.setAttribute('aria-expanded', String(isExpanded));
    };

    mobileBtn?.addEventListener('click', toggleSidebar);

    // Attach page element
    layout.querySelector('.page-slot').appendChild(pageContainer);
    app.appendChild(layout);
}
