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

        const restoreDocumentScroll = () => {
            window.requestAnimationFrame(() => {
                // Never unlock the document while a real Bootstrap layer is open.
                const anOffcanvasIsOpen = Boolean(document.querySelector('.offcanvas.show'));
                const aModalIsOpen = Boolean(document.querySelector('.modal.show'));

                if (anOffcanvasIsOpen || aModalIsOpen) return;

                const body = document.body;
                const hasOrphanedBackdrop = Boolean(
                    document.querySelector('.offcanvas-backdrop, .modal-backdrop')
                );
                const bodyScrollIsLocked =
                    body.style.overflow === 'hidden' ||
                    body.style.paddingRight !== '' ||
                    body.classList.contains('offcanvas-open') ||
                    body.classList.contains('modal-open');

                if (!hasOrphanedBackdrop && !bodyScrollIsLocked) return;

                document.querySelectorAll('.offcanvas-backdrop, .modal-backdrop').forEach((backdrop) => {
                    backdrop.remove();
                });
                body.classList.remove('offcanvas-open', 'modal-open');
                body.style.removeProperty('overflow');
                body.style.removeProperty('padding-right');
            });
        };

        // Recover on the first paint as well as after Inertia visits and full
        // page restores. This handles mobile browsers restoring a page with a
        // stale Bootstrap overflow lock after a drawer was interrupted.
        restoreDocumentScroll();
        window.addEventListener('pageshow', restoreDocumentScroll);
        window.addEventListener('orientationchange', restoreDocumentScroll);

        router.on('navigate', (event) => {
            const pageProps = event.detail?.page?.props ?? {};
            const userPreference = pageProps.auth?.user?.preferred_theme ?? 'system';
            applyUserTheme(userPreference);

            restoreDocumentScroll();
            window.setTimeout(restoreDocumentScroll, 450);
        });

        createRoot(el).render(
            <>
                <App {...props} />
                <Chatbot />
            </>
        );
    },
});