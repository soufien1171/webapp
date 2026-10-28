// Theme Helper — Dark / Light Mode Manager
import * as settingsRepo from '../db/repositories/settings-repo.js';

export function applyTheme(theme = 'dark') {
    const isLight = theme === 'light';
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        document.body.classList.add('light-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.remove('light-theme');
    }
    localStorage.setItem('caisse_theme', theme);
}

export function getCurrentTheme() {
    return localStorage.getItem('caisse_theme') || 'dark';
}

export async function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try {
        const params = await settingsRepo.getParametres();
        params.theme = next;
        await settingsRepo.saveParametres(params);
    } catch (e) {
        // fallback to localStorage
    }
    return next;
}

export async function initTheme() {
    try {
        const params = await settingsRepo.getParametres();
        const theme = params.theme || localStorage.getItem('caisse_theme') || 'dark';
        applyTheme(theme);
    } catch {
        applyTheme(localStorage.getItem('caisse_theme') || 'dark');
    }
}
