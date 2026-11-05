"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  // useActionState : appelle la server action et récupère son retour (ici un éventuel message d'erreur).
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        error={state.error}
      />
      <Button type="submit" variant="primary" block busy={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
