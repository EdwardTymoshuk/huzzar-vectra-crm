// src/lib/authOptions.ts
import { prisma } from '@/utils/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { Role, UserStatus } from '@prisma/client'
import bcrypt from 'bcrypt'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Brak e-maila lub hasła')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { locations: { select: { id: true, name: true } } },
        })
        if (!user) throw new Error('Użytkownik nie istnieje')

        // status check
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

        const locations = await prisma.warehouseLocation.findMany({
          where: { users: { some: { id: user.id } } },
          select: { id: true, name: true },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          identyficator: user.identyficator ?? null,
          role: user.role as Role,
          status: user.status as UserStatus,
          locations,
        }
      },
    }),
  ],

  callbacks: {
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        phoneNumber: token.phoneNumber,
        identyficator: token.identyficator,
        role: token.role,
        status: token.status,
        locations: token.locations,
      }
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
