import LoginForm from '@/components/form/login-form';
import SetupRedirect from '@/components/form/setup-redirect';

export default function LoginPage() {
	return (
		<div className="w-full h-screen flex flex-col items-center justify-center">
			<SetupRedirect whenNeeded to="/setup" />
			<LoginForm mode="login" />
		</div>
	);
}
