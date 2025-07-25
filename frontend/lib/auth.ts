import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call your backend API
          const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success && data.data.token) {
            return {
              id: data.data.user.id,
              email: data.data.user.email,
              name: `${data.data.user.firstName} ${data.data.user.lastName}`,
              token: data.data.token, // Backend JWT token
            };
          }
          
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      // Persist the backend token in the JWT
      if (user) {
        token.backendToken = (user as any).token;
        token.userId = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Send backend token to the client
      (session as any).backendToken = token.backendToken;
      (session as any).userId = token.userId;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Custom redirect logic after sign in
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // If it's a relative URL, assume it's trying to go to dashboard
      if (url === baseUrl) return `${baseUrl}/login`
      return url
    },
  },
  
  pages: {
    signIn: "/login", // Change from /auth/login to /login
    error: "/login", // Redirect errors to login page too
  },
  
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};