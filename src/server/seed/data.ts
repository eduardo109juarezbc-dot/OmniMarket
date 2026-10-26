import type { ProductCategory } from "../../lib/domain";

/** Catálogo base del conjunto semilla: 40 productos en 6 categorías. */
export const PRODUCT_CATALOG: Record<
  ProductCategory,
  { prefix: string; priceRange: [number, number]; names: readonly string[] }
> = {
  ELECTRONICS: {
    prefix: "ELE",
    priceRange: [1_999, 34_999],
    names: [
      "Auriculares inalámbricos",
      "Teclado mecánico",
      "Ratón ergonómico",
      "Monitor 27 pulgadas",
      "Cargador USB-C 65 W",
      "Altavoz Bluetooth",
      "Cámara web HD",
      "Disco SSD 1 TB",
    ],
  },
  HOME: {
    prefix: "HOG",
    priceRange: [899, 18_999],
    names: [
      "Lámpara de escritorio",
      "Juego de sartenes",
      "Cafetera de goteo",
      "Manta de algodón",
      "Organizador de cocina",
      "Set de toallas",
      "Purificador de aire",
    ],
  },
  FASHION: {
    prefix: "MOD",
    priceRange: [1_499, 12_999],
    names: [
      "Chaqueta impermeable",
      "Zapatillas urbanas",
      "Mochila de lona",
      "Gafas de sol",
      "Reloj analógico",
      "Camiseta orgánica",
      "Cinturón de cuero",
    ],
  },
  SPORTS: {
    prefix: "DEP",
    priceRange: [999, 24_999],
    names: [
      "Esterilla de yoga",
      "Mancuernas ajustables",
      "Botella térmica",
      "Bicicleta estática",
      "Balón de fútbol",
      "Cuerda de saltar",
      "Raqueta de pádel",
    ],
  },
  BEAUTY: {
    prefix: "BEL",
    priceRange: [599, 6_999],
    names: [
      "Crema hidratante",
      "Sérum facial",
      "Secador de pelo",
      "Perfume cítrico",
      "Kit de manicura",
      "Protector solar",
    ],
  },
  TOYS: {
    prefix: "JUG",
    priceRange: [799, 9_999],
    names: [
      "Bloques de construcción",
      "Puzle de 1000 piezas",
      "Juego de mesa familiar",
      "Peluche de oso",
      "Coche teledirigido",
    ],
  },
};

export const FIRST_NAMES = [
  "Lucía",
  "Mateo",
  "Sofía",
  "Martín",
  "Valentina",
  "Hugo",
  "Camila",
  "Leo",
  "Martina",
  "Daniel",
  "Julia",
  "Pablo",
  "Isabella",
  "Álvaro",
  "Paula",
  "Diego",
  "Elena",
  "Andrés",
  "Carla",
  "Tomás",
] as const;

export const LAST_NAMES = [
  "García",
  "Rodríguez",
  "Martínez",
  "López",
  "Sánchez",
  "Pérez",
  "Gómez",
  "Fernández",
  "Díaz",
  "Torres",
  "Ramírez",
  "Flores",
  "Castro",
  "Ortiz",
  "Peña",
] as const;

export const CITIES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Bilbao",
  "Ciudad de México",
  "Bogotá",
  "Lima",
  "Santiago",
  "Buenos Aires",
  "Quito",
  "Montevideo",
] as const;
