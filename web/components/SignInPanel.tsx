import { signIn } from "@/auth";

export function SignInPanel() {
  return <div className="panel-grid"><div className="panel"><h2>Organization access</h2>
    <p className="lede">Sign in through an upstream identity to verify organization membership and launch a canonical evaluation.</p></div>
    <div className="panel"><form action={async () => { "use server"; await signIn("huggingface", { redirectTo: "/dashboard" }); }}>
      <button className="button" type="submit">Continue with Hugging Face</button></form>
      <form action={async () => { "use server"; await signIn("github", { redirectTo: "/dashboard" }); }}>
        <button className="button secondary" type="submit">Continue with GitHub</button></form></div></div>;
}
