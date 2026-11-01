'use client';

import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormRootError,
} from '@workspace/ui/components/form';
import { ApiError } from '@workspace/api-client';
import { api } from '@/lib/api';
import { loginSchema, setupSchema } from '@/lib/form';

const modes = {
	login: { schema: loginSchema, submit: api.login, label: 'Login' },
	setup: { schema: setupSchema, submit: api.setup, label: 'Create account' },
};

export default function LoginForm({ mode }: { mode: keyof typeof modes }) {
	const { schema, submit, label } = modes[mode];
	const router = useRouter();

	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(schema),
	});

	const onSubmit = async (values: z.infer<typeof loginSchema>) => {
		try {
			await submit({ body: values });
		} catch (error) {
			form.setError('root', { message: error instanceof ApiError ? error.message : 'Login failed' });
			return;
		}
		router.replace('/dashboard');
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border py-8 px-4 rounded-md">
				<FormField
					control={form.control}
					name="username"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Username</FormLabel>
							<FormControl>
								<Input {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Password</FormLabel>
							<FormControl>
								<Input type="password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormRootError />
				<Button type="submit">{label}</Button>
			</form>
		</Form>
	);
}
