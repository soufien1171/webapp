// Employee login with a full virtual keyboard.
import * as utilisateurRepo from '../db/repositories/utilisateur-repo.js';
import { setEmployeeSession } from '../auth.js';
import { renderNumpad } from '../components/numpad.js';
import { navigateTo } from '../router.js';
import { toast } from '../components/toast.js';

export function renderLoginPage() {
    const page = document.createElement('div');
    page.className = 'login-page flex flex-center w-full h-full p-4';

    page.innerHTML = `
        <div class="card login-card p-6 w-full max-width-md">
            <div class="text-center mb-6">
                <div class="badge badge-accent mb-2">Accès sécurisé</div>
                <h2 class="text-2xl font-bold text-primary">Connexion</h2>
                <p class="text-xs text-secondary mt-1">Saisissez votre nom d'utilisateur et votre mot de passe</p>
            </div>

            <form class="login-form flex flex-col gap-4">
                <div class="form-group">
                    <label class="form-label" for="login-username">Nom d'utilisateur</label>
                    <input type="text" id="login-username" class="form-input text-lg font-mono text-center tracking-wider" value="" required autocomplete="username" />
                </div>

                <div class="form-group">
                    <label class="form-label" for="login-pw">Mot de passe</label>
                    <input type="password" id="login-pw" class="form-input text-lg font-mono text-center tracking-widest" value="" required autocomplete="current-password" />
                </div>

                <button type="submit" class="btn btn-primary btn-lg w-full font-bold btn-submit-login mt-2">
                    Ouvrir la session
                </button>
                <a href="#/inscription" class="text-center text-accent text-sm font-semibold mt-2">S'inscrire avec Google</a>
            </form>

            <div class="numpad-toggle-container text-center mt-4">
                <button type="button" class="btn btn-ghost btn-sm btn-toggle-numpad text-accent">
                    ⌨ Afficher / Masquer le clavier
                </button>
                <div class="virtual-numpad-wrapper mt-3 hidden"></div>
            </div>
        </div>
    `;

    const form = page.querySelector('.login-form');
    const usernameInput = page.querySelector('#login-username');
    const passwordInput = page.querySelector('#login-pw');
    const keyboardWrapper = page.querySelector('.virtual-numpad-wrapper');
    const toggleKeyboardButton = page.querySelector('.btn-toggle-numpad');

    let activeInput = usernameInput;
    usernameInput.addEventListener('focus', () => { activeInput = usernameInput; });
    passwordInput.addEventListener('focus', () => { activeInput = passwordInput; });

    const keyboard = renderNumpad(
        key => {
            if (key === 'CLEAR') activeInput.value = '';
            else activeInput.value += key;
            activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        },
        () => {
            activeInput.value = activeInput.value.slice(0, -1);
        },
        () => form.requestSubmit(),
        { full: true }
    );
    keyboardWrapper.appendChild(keyboard);

    toggleKeyboardButton.addEventListener('click', () => {
        keyboardWrapper.classList.toggle('hidden');
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            toast.warning("Veuillez renseigner le nom d'utilisateur et le mot de passe.");
            return;
        }

        try {
            const user = await utilisateurRepo.authenticate(username, password);
            if (!user) {
                toast.error('Nom d’utilisateur ou mot de passe incorrect.');
                passwordInput.value = '';
                passwordInput.focus();
                return;
            }

            setEmployeeSession(user);
            toast.success(`Bienvenue, ${user.prenom} ${user.nom}!`);
            const role = Number(user.role || 1);
            navigateTo(role === 1 || role === 2 ? '#/caisse-open' : '#/caisse');
        } catch (err) {
            console.error(err);
            toast.error('Erreur de connexion.');
        }
    });

    return page;
}
