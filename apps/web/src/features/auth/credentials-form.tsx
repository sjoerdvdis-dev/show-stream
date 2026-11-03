import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ApiError } from '@workspace/api-client';
import { endpoints, minimumPasswordLength } from '@workspace/contract/endpoints';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { LoaderCircle } from 'lucide-react';
import type { z } from 'zod';
import { sessionQuery } from '@/features/auth/queries';
import { api } from '@/lib/api';

const modes = {
	login: {
		schema: endpoints.login.body,
		submit: api.login,
		label: 'Log in',
		password: 'current-password',
		passwordHint: undefined,
	},
	setup: {
		schema: endpoints.setup.body,
		submit: api.setup,
		label: 'Create account',
		password: 'new-password',
		passwordHint: `At least ${minimumPasswordLength} characters.`,
	},
};

type Values = z.infer<typeof endpoints.login.body>;

/**
 * Login and first-run setup. These call the API directly rather than through a mutation, because
 * here a 401 is a wrong password, which stays on the form, and not a lost session.
 */
export const CredentialsForm = ({ mode, onDone }: { mode: keyof typeof modes; onDone: () => void }) => {
	const { schema, submit, label, password, passwordHint } = modes[mode];
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

	const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined;

	return (
		<form onSubmit={handleSubmit(onSubmit)} noValidate>
			<FieldGroup>
				<Field data-invalid={Boolean(errors.username) || undefined}>
					<FieldLabel htmlFor="username">Username</FieldLabel>
					<Input
						id="username"
						autoComplete="username"
						aria-invalid={Boolean(errors.username)}
						aria-describedby={describedBy(Boolean(errors.username) && 'username-error')}
						{...register('username')}
					/>
					{errors.username ? <FieldError id="username-error">{errors.username.message}</FieldError> : null}
				</Field>
				<Field data-invalid={Boolean(errors.password) || undefined}>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<Input
						id="password"
						type="password"
						autoComplete={password}
						aria-invalid={Boolean(errors.password)}
						aria-describedby={describedBy(
							Boolean(passwordHint) && 'password-hint',
							Boolean(errors.password) && 'password-error',
						)}
						{...register('password')}
					/>
					{passwordHint ? <FieldDescription id="password-hint">{passwordHint}</FieldDescription> : null}
					{errors.password ? <FieldError id="password-error">{errors.password.message}</FieldError> : null}
				</Field>
				{errors.root ? <FieldError>{errors.root.message}</FieldError> : null}
				<Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
					{isSubmitting ? <LoaderCircle aria-hidden="true" data-icon="inline-start" className="animate-spin" /> : null}
					{label}
				</Button>
			</FieldGroup>
		</form>
	);
};
