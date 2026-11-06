"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { login, type LoginField, type LoginState } from "./actions";

type LoginFormProps = {
  /** Faut-il demander l'adresse Pronote ? (non si un seul établissement est autorisé) */
  askUrl: boolean;
  defaultUrl?: string;
};

export function LoginForm({ askUrl, defaultUrl }: LoginFormProps) {
  // useActionState : appelle la server action et récupère son retour (ici un éventuel message d'erreur).
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  const errorFor = (field: LoginField) => (state.field === field ? state.error : undefined);
  // Le premier champ en erreur reçoit le focus ; sinon le premier champ à remplir.
  const focus: LoginField = state.field ?? (askUrl && !defaultUrl ? "url" : "username");

  return (
    // React vide le formulaire après chaque envoi : la clé le recrée avec les valeurs renvoyées par l'action.
    <form key={JSON.stringify(state.values ?? {})} action={formAction} className="flex flex-col gap-6" noValidate>
      {state.error && !state.field && <Banner>{state.error}</Banner>}

      {askUrl && (
        <TextField
          label="Adresse Pronote"
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.url ?? defaultUrl}
          help="L'adresse de la page de connexion Pronote de ton établissement."
          error={errorFor("url")}
          autoFocus={focus === "url"}
        />
      )}
      <TextField
        label="Identifiant Pronote"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        defaultValue={state.values?.username}
        error={errorFor("username")}
        autoFocus={focus === "username"}
      />
      <TextField
        label="Mot de passe Pronote"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={errorFor("password")}
        autoFocus={focus === "password"}
      />

      <div className="flex flex-col gap-3">
        <Button type="submit" variant="primary" block busy={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
        <p className="text-caption text-ink-muted">
          Ton mot de passe sert seulement à te connecter à Pronote : il n&apos;est jamais enregistré.{" "}
          <Link href="/confidentialite" className="rounded-sm font-medium text-accent underline underline-offset-2">
            Données et confidentialité
          </Link>
        </p>
      </div>
    </form>
  );
}
