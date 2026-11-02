import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, createApp } from '@/lib/app';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App app={createApp()} />
	</StrictMode>,
);
