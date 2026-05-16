"use client";

import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { savePendingProfile, getUserProfile, saveUserProfile } from "@/lib/firebase/profile";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [needsNickname, setNeedsNickname] = useState(false);
  const [error, setError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      await continueAfterAuth(credential.user);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential =
        mode === "login"
          ? await signInWithEmailAndPassword(firebaseAuth, email, password)
          : await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await continueAfterAuth(credential.user);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function continueAfterAuth(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }) {
    try {
      const profile = await withTimeout(getUserProfile(user.uid), 2500);
      if (profile?.nickname) {
        router.push("/");
        return;
      }
    } catch (caught) {
      console.warn("Profile lookup failed; asking for nickname locally.", caught);
      setProfileNotice("We could not reach the profile database. Choose a nickname now and Do will keep it locally until Firestore is available.");
    }

    setNickname(user.displayName ?? nicknameFromEmail(user.email));
    setNeedsNickname(true);
  }

  async function handleNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = firebaseAuth.currentUser;
    const cleanNickname = nickname.trim();

    if (!user) {
      setError("Please sign in again before choosing a nickname.");
      return;
    }

    if (cleanNickname.length < 2) {
      setError("Choose a nickname with at least 2 characters.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const profileInput = {
        uid: user.uid,
        nickname: cleanNickname,
        email: user.email,
        photoURL: user.photoURL
      };
      await withTimeout(saveUserProfile(profileInput), 2500);
      router.push("/");
    } catch (caught) {
      if (isFirestoreUnavailable(caught)) {
        savePendingProfile({
          uid: user.uid,
          nickname: cleanNickname,
          email: user.email,
          photoURL: user.photoURL
        });
        router.push("/");
        return;
      }

      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  if (needsNickname) {
    return (
      <section className="login-card">
        <p className="eyebrow">Do / 道 / 도</p>
        <h1>Choose what people call you.</h1>
        <p className="login-copy">This nickname will be stored with your Do account profile.</p>
        {profileNotice ? <p className="login-notice">{profileNotice}</p> : null}
        <form className="login-form" onSubmit={handleNickname}>
          <label>
            Nickname
            <input
              autoComplete="nickname"
              maxLength={24}
              minLength={2}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Fawwaz"
              required
              value={nickname}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button className="submit-button" disabled={loading} type="submit">
            {loading ? "Saving" : "Continue"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="login-card">
      <p className="eyebrow">Do / 道 / 도</p>
      <h1>Sign in to keep your path.</h1>
      <p className="login-copy">Use Do to find small, real-world chances to practice connection in Seoul and Tokyo.</p>

      <button className="google-button" disabled={loading} onClick={handleGoogle} type="button">
        Continue with Google
      </button>

      <div className="login-divider">
        <span />
        <p>or</p>
        <span />
      </div>

      <div className="mode-switch" aria-label="Authentication mode">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
          Log in
        </button>
        <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
          Sign up
        </button>
      </div>

      <form className="login-form" onSubmit={handleEmail}>
        <label>
          Email
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label>
          Password
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="login-error">{error}</p> : null}
        <button className="submit-button" disabled={loading} type="submit">
          {loading ? "Please wait" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </section>
  );
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    console.error("Firebase auth error:", code, error);

    if (code.includes("auth/configuration-not-found")) {
      return "Firebase Authentication is not enabled for this project yet.";
    }
    if (code.includes("auth/popup-closed-by-user")) {
      return "The Google sign-in window was closed.";
    }
    if (code.includes("auth/popup-blocked")) {
      return "Your browser blocked the Google sign-in popup.";
    }
    if (code.includes("auth/cancelled-popup-request")) {
      return "Another Google sign-in popup was already open.";
    }
    if (code.includes("auth/unauthorized-domain")) {
      return "This domain is not authorized in Firebase Authentication. Add localhost in Firebase authorized domains.";
    }
    if (code.includes("auth/operation-not-allowed")) {
      return "This sign-in method is not enabled in Firebase Authentication yet.";
    }
    if (code.includes("auth/network-request-failed")) {
      return "Network error while contacting Firebase. Check your connection and try again.";
    }
    if (code.includes("auth/invalid-api-key")) {
      return "The Firebase API key is invalid or does not match this project.";
    }
    if (code.includes("auth/invalid-credential")) {
      return "The email or password does not look right.";
    }
    if (code.includes("auth/user-not-found")) {
      return "No account exists for that email yet. Try signing up.";
    }
    if (code.includes("auth/wrong-password")) {
      return "The password does not match that email.";
    }
    if (code.includes("auth/email-already-in-use")) {
      return "That email already has an account. Try logging in.";
    }
    if (code.includes("auth/weak-password")) {
      return "Use a password with at least 6 characters.";
    }
    if (code.includes("auth/too-many-requests")) {
      return "Firebase temporarily blocked attempts for this account. Try again later.";
    }
    if (code.includes("permission-denied")) {
      return "Firestore blocked profile access. Enable Firestore and allow signed-in users to read/write their own profile.";
    }
    if (code.includes("unavailable")) {
      return "Firestore is temporarily unavailable. Try again in a moment.";
    }

    return `Firebase returned ${code}. Check the Firebase Authentication settings for this project.`;
  }

  return "Something went wrong. Please try again.";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject({ code: "firestore/save-timeout" }), timeoutMs);
    })
  ]);
}

function isFirestoreUnavailable(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String(error.code);
    return code.includes("unavailable") || code.includes("failed-precondition") || code.includes("save-timeout");
  }

  return false;
}

function nicknameFromEmail(email: string | null) {
  return email?.split("@")[0] ?? "";
}
