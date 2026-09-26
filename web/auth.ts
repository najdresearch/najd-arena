import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import HuggingFace from "next-auth/providers/huggingface";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: process.env.DATABASE_URL ? PostgresAdapter(pool) : undefined,
  providers: [
    GitHub({ authorization: { params: { scope: "read:user user:email read:org" } } }),
    HuggingFace({ authorization: { params: { scope: "openid profile email" } } }),
  ],
  session: { strategy: process.env.DATABASE_URL ? "database" : "jwt" },
  pages: { signIn: "/dashboard" },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (!process.env.DATABASE_URL || !account?.access_token || !user.id) return;
      type UpstreamOrg = { id: string; slug: string; name: string; role: "admin" | "runner" | "viewer" };
      let organizations: UpstreamOrg[] = [];
      if (account.provider === "github") {
        const response = await fetch("https://api.github.com/user/memberships/orgs?state=active&per_page=100", {
          headers: { Authorization: `Bearer ${account.access_token}`, Accept: "application/vnd.github+json" },
        });
        if (response.ok) {
          const memberships = await response.json() as Array<{role: string; organization: {id: number; login: string; avatar_url: string}}>;
          organizations = memberships.map(item => ({ id: String(item.organization.id), slug: item.organization.login,
            name: item.organization.login, role: item.role === "admin" ? "admin" : "runner" }));
        }
      } else if (account.provider === "huggingface") {
        const values = (profile as {orgs?: Array<{sub: string; preferred_username: string; name: string; roleInOrg?: string}>})?.orgs ?? [];
        organizations = values.map(item => ({ id: item.sub, slug: item.preferred_username, name: item.name,
          role: item.roleInOrg === "admin" ? "admin" : item.roleInOrg === "read" ? "viewer" : "runner" }));
      }
      for (const organization of organizations) {
        const result = await pool.query(`INSERT INTO organizations(provider, provider_org_id, slug, name)
          VALUES ($1,$2,$3,$4) ON CONFLICT(provider, provider_org_id) DO UPDATE SET slug=excluded.slug,
          name=excluded.name RETURNING id`, [account.provider, organization.id, organization.slug, organization.name]);
        await pool.query(`INSERT INTO organization_memberships(organization_id,user_id,role,verified_at)
          VALUES ($1,$2,$3,now()) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=excluded.role,
          verified_at=now()`, [result.rows[0].id, user.id, organization.role]);
      }
      await pool.query(`UPDATE accounts SET access_token=NULL, refresh_token=NULL WHERE provider=$1
        AND "providerAccountId"=$2`, [account.provider, account.providerAccountId]);
    },
  },
});
