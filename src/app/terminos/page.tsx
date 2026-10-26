import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso" updated="25 de octubre de 2026">
      <p>
        OmniMarket · Operations Hub es un proyecto académico de demostración, sin fines comerciales.
        Al usarlo aceptas estos términos.
      </p>
      <h2>Uso permitido</h2>
      <ul>
        <li>Explorar el dashboard, el tablero Kanban y la gestión de productos y pedidos.</li>
        <li>Crear y modificar datos de prueba, que pueden restablecerse en cualquier momento.</li>
      </ul>
      <h2>Datos de prueba</h2>
      <p>
        Los productos, clientes y pedidos son ficticios. No introduzcas datos personales reales ni
        información sensible.
      </p>
      <h2>Disponibilidad</h2>
      <p>
        El servicio se ofrece tal cual, sin garantías de disponibilidad ni de conservación de los
        datos de prueba.
      </p>
      <h2>Privacidad</h2>
      <p>
        El tratamiento de los datos de inicio de sesión se describe en la{" "}
        <a href="/privacidad" className="font-medium text-brand hover:underline">
          política de privacidad
        </a>
        .
      </p>
    </LegalPage>
  );
}
