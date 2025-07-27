import { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"
import CredentialsProvider from "next-auth/providers/credentials"

declare module "next-auth" {

  interface User {
    id: string;
    role: string;
    backendToken: string;
  }

  interface Account {}

  interface Session {
    userId: string;
    role: string;
    backendToken: string;
    user: User; // Overriding the default user type
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWTs for sessions */
  interface JWT {
    userId: string;
    role: string;
    backendToken: string;
  }
}


// 2. Your authOptions can now use these extended types without errors.
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" }
          })
          
          const responseData = await res.json()

          if (!res.ok || !responseData.success) {
            return null
          }

          // The object returned here must match the extended User type above
          return {
            ...responseData.data.user,
            backendToken: responseData.data.token,
          }
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      // The 'user' object here will have the correct type, including 'role' and 'backendToken'
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.backendToken = user.backendToken
      }
      return token
    },
    async session({ session, token }) {
      // The 'token' object has the correct type from the JWT declaration
      if (token) {
        session.userId = token.userId
        session.role = token.role
        session.backendToken = token.backendToken
      }
      return session
    }
  },
  
  pages: {
    signIn: '/auth/login',
  },
  
  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
