import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type FieldError } from 'react-hook-form';
import { ApiError } from '@workspace/api-client';
import { endpoints } from '@workspace/contract/endpoints';
import type { z } from 'zod';
import { sessionQuery } from '@/features/auth/queries';
import { api } from '@/lib/api';

const modes = {
	login: { schema: endpoints.login.body, submit: api.login, label: 'Log in', password: 'current-password' },
	setup: { schema: endpoints.setup.body, submit: api.setup, label: 'Create account', password: 'new-password' },
};

const fieldClass = 'w-full rounded-md border border-input bg-transparent px-3 py-2 aria-invalid:border-destructive';
const errorClass = 'text-sm text-destructive';

const FieldMessage = ({ id, error }: { id: string; error?: FieldError }) =>
	error ? (
		<p id={id} className={errorClass}>
			{error.message}
		</p>
	) : null;

type Values = z.infer<typeof endpoints.login.body>;

/**
 * Login and first-run setup. These call the API directly rather than through a mutation, because
 * here a 401 is a wrong password, which stays on the form, and not a lost session.
 */
export const CredentialsForm = ({ mode, onDone }: { mode: keyof typeof modes; onDone: () => void }) => {
	const { schema, submit, label, password } = modes[mode];
	const queryClient = useQueryClient();
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });

	const onSubmit = async (values: Values) => {
		try {
			const { user } = await submit({ body: values });
			queryClient.setQueryData(sessionQuery.queryKey, user);
		} catch (error) {
			setError('root', { message: error instanceof ApiError ? error.message : 'Something went wrong' });
			return;
		}
		onDone();
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<label htmlFor="username">Username</label>
				<input
					id="username"
					autoComplete="username"
					aria-invalid={Boolean(errors.username)}
					aria-describedby={errors.username ? 'username-error' : undefined}
					className={fieldClass}
					{...register('username')}
				/>
				<FieldMessage id="username-error" error={errors.username} />
			</div>
			<div className="flex flex-col gap-1">
				<label htmlFor="password">Password</label>
				<input
					id="password"
					type="password"
					autoComplete={password}
					aria-invalid={Boolean(errors.password)}
					aria-describedby={errors.password ? 'password-error' : undefined}
					className={fieldClass}
					{...register('password')}
				/>
				<FieldMessage id="password-error" error={errors.password} />
			</div>
			{errors.root ? (
				<p role="alert" className={errorClass}>
					{errors.root.message}
				</p>
			) : null}
			<button
				type="submit"
				disabled={isSubmitting}
				className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60"
			>
				{label}
			</button>
		</form>
	);
};
