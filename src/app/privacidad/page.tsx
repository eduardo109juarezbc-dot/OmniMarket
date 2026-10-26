import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="25 de octubre de 2026">
      <p>
        OmniMarket · Operations Hub es un proyecto académico de demostración: un dashboard de
        analítica y operaciones de e-commerce. Esta política explica qué datos se tratan al iniciar
        sesión.
      </p>
      <h2>Datos que se reciben</h2>
      <p>
        Al iniciar sesión con Google o con GitHub, el proveedor comparte con la aplicación tu
        identificador de cuenta, tu nombre, tu dirección de correo electrónico y la URL de tu foto
        de perfil. No se solicitan otros permisos ni se accede a tus archivos, contactos o
        repositorios.
      </p>
      <h2>Para qué se usan</h2>
      <ul>
        <li>Identificarte y mantener tu sesión abierta.</li>
        <li>Mostrar tu nombre, tu foto y el proveedor en la cabecera de la aplicación.</li>
      </ul>
      <h2>Dónde se guardan</h2>
      <p>
        La autenticación la gestiona Supabase, que almacena tu perfil básico y emite la sesión. La
        sesión se guarda en cookies del navegador. Los datos de negocio (productos, clientes y
        pedidos) son ficticios y no contienen información de personas reales.
      </p>
      <h2>Con quién se comparten</h2>
      <p>
        No se venden ni se ceden datos a terceros. No se usan para publicidad ni analítica de
        terceros.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes cerrar sesión en cualquier momento y revocar el acceso desde la configuración de
        seguridad de tu cuenta de Google o de GitHub. Para solicitar la eliminación de tu cuenta en
        la aplicación, contacta con el responsable del proyecto a través del repositorio público.
      </p>
    </LegalPage>
  );
}
