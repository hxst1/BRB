import { useState, type FormEvent } from "react";
import { brand } from "@repo/brand";
import { openSite } from "@/lib/open";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-focus";

export function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: signInError } = await supabase().auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setPending(false);
    if (signInError) {
      setError(signInError.code === "invalid_credentials" ? "El email o la contraseña no coinciden." : "No se ha podido entrar.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h1 className="display text-3xl font-bold">Entra para jugar</h1>
      <p className="-mt-1 text-sm text-muted">Con tu cuenta de {brand.name}: verás si te toca y podrás echar un 2048 desde aquí.</p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-xl bg-ink py-2.5 font-semibold text-bg disabled:opacity-50">
        {pending ? "Un momento…" : "Entrar"}
      </button>
      <button type="button" onClick={() => void openSite("/entrar")} className="text-sm text-muted hover:text-ink">
        ¿No tienes cuenta? Créala en la web
      </button>
    </form>
  );
}
