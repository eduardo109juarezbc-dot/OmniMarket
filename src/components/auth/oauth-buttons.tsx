"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROVIDER_LABELS, type OAuthProvider } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { GitHubIcon, GoogleIcon } from "./provider-icons";

const ICONS: Record<OAuthProvider, typeof GoogleIcon> = {
  google: GoogleIcon,
  github: GitHubIcon,
};

/**
 * Únicos métodos de acceso: OAuth 2.0 con Google y GitHub (Requisitos 2.1–2.4).
 * `next` ya llega saneado desde el servidor.
 */
export function OAuthButtons({ next }: { next: string }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  async function signIn(provider: OAuthProvider) {
    setPending(provider);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);

    const { error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });

    // Si todo va bien, el navegador ya está navegando al proveedor.
    if (error) {
      setPending(null);
      toast.error(`No se pudo conectar con ${PROVIDER_LABELS[provider]}. Inténtalo de nuevo.`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(["google", "github"] as const).map((provider) => {
        const Icon = ICONS[provider];
        return (
          <Button
            key={provider}
            variant="secondary"
            className="h-11 w-full"
            pending={pending === provider}
            disabled={pending !== null}
            onClick={() => void signIn(provider)}
            data-testid={`login-${provider}`}
          >
            <Icon className="size-5" />
            Continuar con {PROVIDER_LABELS[provider]}
          </Button>
        );
      })}
    </div>
  );
}
