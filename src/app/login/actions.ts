"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAppPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { ONBOARDED_COOKIE } from "@/lib/preferences";

export type LoginState = { error?: string };

// Anti force brute minimal (en mémoire) : 5 échecs max par tranche de 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;
const failures: number[] = [];

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const now = Date.now();
  while (failures.length && now - failures[0] > WINDOW_MS) failures.shift();
  if (failures.length >= MAX_FAILURES) {
    return { error: "Trop de tentatives. Réessaie dans quelques minutes." };
  }

  const password = String(formData.get("password") ?? "");
  if (!password || !(await verifyAppPassword(password))) {
    failures.push(now);
    await new Promise((r) => setTimeout(r, 800)); // ralentit les essais en rafale
    return { error: "Mot de passe incorrect. Vérifie-le et réessaie." };
  }

  failures.length = 0;
  await createSession();
  // Première connexion sur cet appareil : on propose de choisir sa couleur et son apparence.
  const onboarded = (await cookies()).get(ONBOARDED_COOKIE)?.value === "1";
  redirect(onboarded ? "/" : "/bienvenue");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
