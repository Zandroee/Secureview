import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../css/secureview-theme.css';

import './bootstrap';
import Chatbot from './Components/Chatbot';

import { createInertiaApp, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { installTableSorting } from './tableSorting';

function ThemeManager() {
    const { props, url } = usePage();
    const preference = props.auth?.user?.preferred_theme ?? 'system';

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = () => {
            const theme = preference === 'system'
                ? (media.matches ? 'dark' : 'light')
                : preference;

            document.documentElement.setAttribute('data-bs-theme', theme);
            document.documentElement.setAttribute('data-theme-preference', preference);
        };

        applyTheme();

        if (preference === 'system') {
            media.addEventListener('change', applyTheme);
            return () => media.removeEventListener('change', applyTheme);
        }
    }, [preference, url]);

    return null;
}

createInertiaApp({
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),

    setup({ el, App, props }) {
        installTableSorting();
        createRoot(el).render(
            <>
                <ThemeManager />
                <App {...props} />
                <Chatbot />
            </>
        );
    },
});