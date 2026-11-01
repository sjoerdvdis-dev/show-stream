import LoginForm from '@/components/form/login-form';
import SetupRedirect from '@/components/form/setup-redirect';

export default function SetupPage() {
	return (
		<div className="w-full h-screen flex flex-col items-center justify-center gap-4">
			<SetupRedirect whenNeeded={false} to="/login" />
			<h1 className="text-2xl">Create the owner account</h1>
			<LoginForm mode="setup" />
		</div>
	);
}
