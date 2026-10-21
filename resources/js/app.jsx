import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../css/secureview-theme.css';

import './bootstrap';
import Chatbot from './Components/Chatbot';

import { createInertiaApp } from '@inertiajs/react';
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
        applyUserTheme(document.documentElement.getAttribute('data-theme-preference') || 'system');
        createRoot(el).render(
            <>
                <App {...props} />
                <Chatbot />
            </>
        );
    },
});