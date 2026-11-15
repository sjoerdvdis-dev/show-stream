// First, so that no schema is made before it runs.
import '@/lib/zod-without-eval';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from '@/features/app/app-update';
import { listenForInstallPrompt } from '@/features/app/install-prompt';
import { App, createApp } from '@/lib/app';
import './index.css';

listenForInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App app={createApp()} />
	</StrictMode>,
);
