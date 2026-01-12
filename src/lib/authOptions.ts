// src/lib/authOptions.ts
import { prisma } from '@/utils/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { UserStatus } from '@prisma/client'
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
          include: {
            modules: {
              include: { module: true },
            },
            locations: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        if (!user) throw new Error('Użytkownik nie istnieje')

        const locations =
          user.role === 'ADMIN' || user.role === 'COORDINATOR'
            ? await prisma.vectraWarehouseLocation.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              })
            : user.locations

        // Check status
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

        // Convert modules to flat array
        const modules = user.modules.map((m) => ({
          code: m.module.code,
          name: m.module.name,
        }))

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          identyficator: user.identyficator ?? null,
          role: user.role,
          status: user.status,
          modules,
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
        modules: token.modules,
        locations: token.locations,
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.phoneNumber = user.phoneNumber
        token.identyficator = user.identyficator
        token.role = user.role
        token.status = user.status
        token.modules = user.modules
        token.locations = user.locations
        return token
      }

      if (!token.locations && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          include: {
            locations: {
              select: { id: true, name: true },
            },
          },
        })

        if (dbUser) {
          token.locations =
            dbUser.role === 'ADMIN' || dbUser.role === 'COORDINATOR'
              ? await prisma.vectraWarehouseLocation.findMany({
                  select: { id: true, name: true },
                  orderBy: { name: 'asc' },
                })
              : dbUser.locations
        }
      }

      return token
    },
  },

  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
