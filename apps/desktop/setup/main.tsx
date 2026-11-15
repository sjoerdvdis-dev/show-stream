import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupPage } from './setup-page';
import './index.css';

// The theme follows the system, as the web app's does until a user picks one there.
const darkScheme = matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.classList.toggle('dark', darkScheme.matches);
applyTheme();
darkScheme.addEventListener('change', applyTheme);

// The main process passes the address to offer and the reason it is back here, if any.
const query = new URLSearchParams(location.search);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<SetupPage
			connect={window.showStream.connect}
			initialAddress={query.get('address') ?? ''}
			initialMessage={query.get('message') ?? undefined}
		/>
	</StrictMode>,
);
