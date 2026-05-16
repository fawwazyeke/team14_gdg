import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <Link className="back-link" href="/">
        Back to events
      </Link>
      <LoginForm />
    </main>
  );
}
