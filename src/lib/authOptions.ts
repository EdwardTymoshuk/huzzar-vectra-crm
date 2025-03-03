import { prisma } from '@/utils/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
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
          throw new Error('Missing email or password')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) throw new Error('User not found')

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!isValidPassword) throw new Error('Invalid password')

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          identyficator: user.identyficator,
          status: user.status,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as
          | 'USER'
          | 'TECHNICIAN'
          | 'COORDINATOR'
          | 'WAREHOUSEMAN'
          | 'ADMIN'
        session.user.status = token.status as
          | 'ACTIVE'
          | 'INACTIVE'
          | 'SUSPENDED'
        session.user.phoneNumber = token.phoneNumber as string
        session.user.identyficator = token.identyficator as number | null
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.status = user.status
        token.phoneNumber = user.phoneNumber
        token.identyficator = user.identyficator
      }
      return token
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
