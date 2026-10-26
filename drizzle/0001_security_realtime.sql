-- Seguridad y Realtime (Requisitos 3.5 y 9.4).
--
-- La app accede a los datos con Drizzle usando el rol `postgres`, que ignora RLS;
-- la autorización real está en requireUser() de cada handler. Estas reglas son
-- defensa en profundidad para la Data API y para Supabase Realtime.
--
-- El proyecto se crea con "Automatically expose new tables" desactivado, así que
-- los permisos se conceden aquí de forma explícita. Los roles anon/authenticated
-- solo existen en Supabase; el bloque los omite en un Postgres sin ellos.

-- 1. Row Level Security en todas las tablas de negocio.
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN

    -- 2. Sin permisos para visitantes anónimos ni escrituras desde la Data API.
    REVOKE ALL ON TABLE public.customers, public.products, public.orders, public.order_items
      FROM anon, authenticated;
    REVOKE ALL ON SEQUENCE public.order_code_seq FROM anon, authenticated;

    -- 3. Lectura para usuarios autenticados (Realtime necesita SELECT en orders).
    GRANT SELECT ON TABLE public.customers, public.products, public.orders, public.order_items
      TO authenticated;

    -- 4. Políticas: un operador autenticado puede leer; nadie más (deny by default).
    CREATE POLICY "operators_read_customers" ON public.customers
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "operators_read_products" ON public.products
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "operators_read_orders" ON public.orders
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "operators_read_order_items" ON public.order_items
      FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;--> statement-breakpoint

-- 5. Publicar los cambios de pedidos en Supabase Realtime (si la publicación existe).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$$;
