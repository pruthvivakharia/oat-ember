import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { blindHash, cleanPhone, normalizeEmail, decrypt, encrypt } from '@/lib/crypto';

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV !== 'production',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        phone: { label: 'Phone', type: 'tel' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const phone = cleanPhone(credentials?.phone);
        const password = String(credentials?.password || '');
        if (!email || !phone || !password) return null;

        const user = await prisma.user.findUnique({ where: { emailHash: blindHash(email) } });
        if (!user?.passwordHash || !user.phoneHash) return null;
        if (blindHash(phone) !== user.phoneHash) return null;
        if (user.role !== 'ADMIN' && !user.phoneVerifiedAt) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        return {
          id: user.id,
          email,
          name: user.role === 'ADMIN' ? 'Café Admin' : (decrypt(user.nameEncrypted) || 'Customer'),
          role: user.role,
          phone,
          phoneVerified: Boolean(user.phoneVerifiedAt),
        };
      },
    }),
    ...(googleConfigured
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google') return true;
      const email = normalizeEmail(profile?.email || user.email);
      if (!email) return false;
      if (profile && 'email_verified' in profile && profile.email_verified === false) return false;

      const emailHash = blindHash(email);
      const name = String(user.name || profile?.name || 'Customer').trim().slice(0, 100) || 'Customer';
      const existing = await prisma.user.findUnique({ where: { emailHash } });
      const dbUser = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { emailEncrypted: encrypt(email), nameEncrypted: encrypt(name) },
          })
        : await prisma.user.create({
            data: {
              emailEncrypted: encrypt(email),
              emailHash,
              nameEncrypted: encrypt(name),
              phoneEncrypted: null,
              phoneHash: null,
              passwordHash: null,
              role: 'CUSTOMER',
            },
          });

      user.id = dbUser.id;
      user.email = email;
      user.name = name;
      (user as any).role = dbUser.role;
      (user as any).phone = dbUser.phoneHash ? (cleanPhone(decrypt(dbUser.phoneEncrypted)) || undefined) : undefined;
      (user as any).phoneVerified = Boolean(dbUser.phoneVerifiedAt);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.phone = (user as any).phone;
        token.phoneVerified = (user as any).phoneVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).phone = token.phone;
        (session.user as any).phoneVerified = token.phoneVerified;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
};
