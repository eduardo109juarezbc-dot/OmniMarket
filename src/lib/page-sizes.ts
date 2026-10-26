/**
 * Tamaños de página compartidos por el servidor (carga inicial) y los Client
 * Components. No pueden vivir en un archivo "use client": exportadas desde ahí,
 * en el servidor se convierten en referencias de cliente en lugar de valores.
 */
export const SALES_PAGE_SIZE = 10;
export const PRODUCTS_PAGE_SIZE = 20;
export const ORDERS_PAGE_SIZE = 20;
