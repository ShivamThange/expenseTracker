import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { User } from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db/connection';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email: credentials.email }).select('+passwordHash');
        if (!user) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!passwordsMatch) {
          return null;
        }

        // Unverified users: return null so NextAuth emits CredentialsSignin.
        // The login page then calls /api/auth/check-verified to show the right message.
        if (!user.emailVerified) {
          return null;
        }


        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.avatar ?? null,
        };
      },
    }),
  ],
});

