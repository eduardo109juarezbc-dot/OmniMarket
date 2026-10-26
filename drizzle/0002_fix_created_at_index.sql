DROP INDEX "orders_created_at_code_idx";--> statement-breakpoint
CREATE INDEX "orders_created_at_code_idx" ON "orders" USING btree ("created_at" DESC NULLS FIRST,"code");