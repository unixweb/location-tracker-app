import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

// SQLite database connection
const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

function getDb() {
  return new Database(dbPath, { readonly: true });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || "fallback-secret-for-development",
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const db = getDb();

          // Query user from database
          const user = db.prepare('SELECT * FROM User WHERE username = ?')
            .get(credentials.username as string) as any;

          db.close();

          if (!user) {
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) {
            return null;
          }

          // Update last login
          const updateDb = new Database(dbPath);
          updateDb.prepare('UPDATE User SET lastLoginAt = datetime(\'now\') WHERE id = ?')
            .run(user.id);
          updateDb.close();

          return {
            id: user.id,
            name: user.username,
            email: user.email || undefined,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
