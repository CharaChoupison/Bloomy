"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { TextField, type TextFieldProps } from "./text-field";

/**
 * Champ mot de passe avec un bouton pour l'afficher : sur téléphone, relire ce qu'on a tapé
 * évite l'erreur de frappe (et, ici, un échec de plus compté par Pronote).
 * Le libellé du bouton ne change pas, c'est aria-pressed qui porte l'état.
 */
export function PasswordField(props: Omit<TextFieldProps, "type" | "trailing">) {
  const [shown, setShown] = useState(false);
  return (
    <TextField
      {...props}
      type={shown ? "text" : "password"}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          aria-label="Afficher le mot de passe"
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="grid size-touch place-items-center rounded-md text-ink-muted transition-colors duration-[120ms] hover:text-ink"
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
