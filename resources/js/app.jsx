import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../css/secureview-theme.css';

import './bootstrap';
import Chatbot from './Components/Chatbot';

import { createInertiaApp, router } from '@inertiajs/react';
import { applyUserTheme } from './theme';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { installTableSorting } from './tableSorting';

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),

    setup({ el, App, props }) {
        installTableSorting();

        // Prefer the user's persisted setting from the initial Inertia page props.
        // The Blade root template applies an early theme to prevent first-paint flashing,
        // while this keeps the React app in sync when authentication changes via Inertia.
        const initialPreference =
            props.auth?.user?.preferred_theme ??
            document.documentElement.getAttribute('data-theme-preference') ??
            'system';
        applyUserTheme(initialPreference);

        router.on('navigate', (event) => {
            const pageProps = event.detail?.page?.props ?? {};
            const userPreference = pageProps.auth?.user?.preferred_theme ?? 'system';
            applyUserTheme(userPreference);

            // Defensive recovery for Inertia visits that remove an offcanvas
            // before Bootstrap's transition/backdrop cleanup has completed.
            // Never unlock scrolling while another offcanvas or modal is open.
            window.requestAnimationFrame(() => {
                const anOffcanvasIsOpen = Boolean(document.querySelector('.offcanvas.show'));
                const aModalIsOpen = Boolean(document.querySelector('.modal.show'));

                if (anOffcanvasIsOpen || aModalIsOpen) return;

                const hasOrphanedBackdrop = Boolean(document.querySelector('.offcanvas-backdrop'));
                const bodyScrollIsLocked =
                    document.body.style.overflow === 'hidden' ||
                    document.body.style.paddingRight !== '';

                if (!hasOrphanedBackdrop && !bodyScrollIsLocked) return;

                document.querySelectorAll('.offcanvas-backdrop').forEach((backdrop) => {
                    backdrop.remove();
                });
                document.body.classList.remove('offcanvas-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            });
        });

        createRoot(el).render(
            <>
                <App {...props} />
                <Chatbot />
            </>
        );
    },
});