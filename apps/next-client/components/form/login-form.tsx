'use client';

import { z } from 'zod';
import { redirect } from 'next/navigation';
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
import { login } from '@/lib/login';
import { loginSchema } from '@/lib/form';

export default function LoginForm() {
	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(loginSchema),
	});

	const onSubmit = async (values: z.infer<typeof loginSchema>) => {
		const { success, error } = await login(values);
		if (!success || error) {
			form.setError('root', { message: error || 'Login failed' });
			return;
		}
		redirect('/'); // Redirect to home page after successful login
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
				<Button type="submit">Login</Button>
			</form>
		</Form>
	);
}
