// src/lib/authOptions.ts
import { prisma } from '@/utils/prisma'
import { Role, User, UserStatus } from '@prisma/client'
import bcrypt from 'bcrypt'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Only ACTIVE users can sign-in.
       * Any other status → throw an Error → next-auth „CredentialsSignin” error.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Brak e-maila lub hasła')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) throw new Error('Użytkownik nie istnieje')

        /* ------- status gate -------- */
        switch (user.status as UserStatus) {
          case 'ACTIVE':
            break // OK
          case 'SUSPENDED':
            throw new Error('Konto jest zawieszone')
          case 'INACTIVE':
            throw new Error('Konto zostało zarchiwizowane')
          case 'DELETED':
            throw new Error('Konto zostało usunięte')
        }

        /* ------- password check ------- */
        const ok = await bcrypt.compare(credentials.password, user.password)
        if (!ok) throw new Error('Nieprawidłowe hasło')

        /* ------- return object that matches the augmented `User` type ------- */
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          identyficator: user.identyficator,
          role: user.role as Role,
          status: user.status as UserStatus,
        }
      },
    }),
  ],

  callbacks: {
    /**
     * Copy JWT → session so the client can read `role`, `status`, etc.
     */
    async session({ session, token }) {
      if (token) session.user = token as User
      return session
    },

    /**
     * First login: transfer custom fields from `user` → `token`
     */
    async jwt({ token, user }) {
      if (user) Object.assign(token, user)
      return token
    },
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
