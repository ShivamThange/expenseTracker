import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { authConfig } from './auth.config';
import { User } from '@/lib/models/User';
import { connectToDatabase } from '@/lib/db/connection';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
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

        if (!user.passwordHash) {
          return null; // User registered with OAuth, cannot sign in with password
        }

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!passwordsMatch) {
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
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;
        
        await connectToDatabase();
        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          dbUser = await User.create({
            email: user.email,
            name: user.name || profile?.name || 'Unknown User',
            avatar: user.image,
            authProvider: 'google',
            googleId: account.providerAccountId,
            emailVerified: new Date(),
          });
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      if (account && user) {
        if (account.provider === 'google') {
          if (!user.email) return token;
          await connectToDatabase();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
          }
        } else {
          // credentials provider
          token.id = user.id;
        }
      }
      
      // Handle user updates
      if (trigger === 'update' && session?.user) {
        token = { ...token, ...session.user };
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

