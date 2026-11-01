'use client';

import { createContext, use } from 'react';
import type { User } from '@workspace/contract/api-types';

export const UserContext = createContext<User | null>(null);

export const useUser = () => use(UserContext);
