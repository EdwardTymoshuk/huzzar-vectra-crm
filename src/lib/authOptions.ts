import { prisma } from '@/utils/prisma'
import { Role, User, UserStatus } from '@prisma/client'
import bcrypt from 'bcrypt'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const getAuthOptions = async (): Promise<NextAuthOptions> => {
  const { PrismaAdapter } = await import('@next-auth/prisma-adapter')

  return {
    adapter: PrismaAdapter(prisma),

    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },

        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password)
            throw new Error('Brak e-maila lub hasła')

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })
          if (!user) throw new Error('Użytkownik nie istnieje')

          switch (user.status as UserStatus) {
            case 'ACTIVE':
              break
            case 'SUSPENDED':
              throw new Error('Konto jest zawieszone')
            case 'INACTIVE':
              throw new Error('Konto zostało zarchiwizowane')
            case 'DELETED':
              throw new Error('Konto zostało usunięte')
          }

          const ok = await bcrypt.compare(credentials.password, user.password)
          if (!ok) throw new Error('Nieprawidłowe hasło')

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
      async session({ session, token }) {
        if (token) session.user = token as User
        return session
      },
      async jwt({ token, user }) {
        if (user) Object.assign(token, user)
        return token
      },
    },

    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
  }
}
