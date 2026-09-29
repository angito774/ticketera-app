import type { Event, EventCategory } from "@/modules/events/types/event.types";

const EVENTS: Event[] = [
  {
    id: "concert-01",
    title: "Bad Bunny — Tour Nadie Sabe Lo Que Va a Pasar Mañana",
    category: "concert",
    date: "2026-11-14T20:00:00-05:00",
    venue: "Estadio Nacional",
    city: "Lima",
    price: 350,
    imageUrl:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    featured: true,
  },
  {
    id: "concert-02",
    title: "Gian Marco — Concierto Sinfónico",
    category: "concert",
    date: "2026-10-03T21:00:00-05:00",
    venue: "Gran Teatro Nacional",
    city: "Lima",
    price: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    featured: false,
  },
  {
    id: "concert-03",
    title: "Festival Vivo por el Rock",
    category: "concert",
    date: "2026-11-28T18:00:00-05:00",
    venue: "Explanada Costa Verde",
    city: "Lima",
    price: 220,
    imageUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
    featured: true,
  },
  {
    id: "concert-04",
    title: "Wos — Tour Latinoamérica",
    category: "concert",
    date: "2026-12-05T20:30:00-05:00",
    venue: "Arena Perú",
    city: "Arequipa",
    price: 195,
    imageUrl:
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80",
    featured: false,
  },
  {
    id: "concert-05",
    title: "Noche de Boleros con Orquesta",
    category: "concert",
    date: "2026-10-18T21:00:00-05:00",
    venue: "Centro de Convenciones Cusco",
    city: "Cusco",
    price: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
    featured: false,
  },
  {
    id: "concert-06",
    title: "Festival Selvámonos",
    category: "concert",
    date: "2027-01-16T17:00:00-05:00",
    venue: "Parque Zonal Huancayo",
    city: "Huancayo",
    price: 260,
    imageUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80",
    featured: false,
  },
  {
    id: "theater-01",
    title: "El Fantasma de la Ópera",
    category: "theater",
    date: "2026-11-07T19:30:00-05:00",
    venue: "Gran Teatro Nacional",
    city: "Lima",
    price: 140,
    imageUrl:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
    featured: true,
  },
  {
    id: "theater-02",
    title: "Hamlet — Compañía Nacional de Teatro",
    category: "theater",
    date: "2026-10-24T20:00:00-05:00",
    venue: "Teatro Municipal",
    city: "Lima",
    price: 90,
    imageUrl:
      "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
    featured: false,
  },
  {
    id: "theater-03",
    title: "El Lago de los Cisnes — Ballet",
    category: "theater",
    date: "2026-12-12T19:00:00-05:00",
    venue: "Teatro Municipal de Arequipa",
    city: "Arequipa",
    price: 130,
    imageUrl:
      "https://images.unsplash.com/photo-1528822855841-e8bf2075f28d?w=800&q=80",
    featured: false,
  },
  {
    id: "theater-04",
    title: "Stand Up Comedy Night: Los Reyes del Absurdo",
    category: "theater",
    date: "2026-11-21T21:00:00-05:00",
    venue: "Teatro Municipal de Trujillo",
    city: "Trujillo",
    price: 75,
    imageUrl:
      "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&q=80",
    featured: false,
  },
];

// Contrato del servicio: siempre devolver una copia, nunca la referencia interna a EVENTS.
export function getAllEvents(): Event[] {
  return [...EVENTS];
}

export function getFeaturedEvents(): Event[] {
  return EVENTS.filter((event) => event.featured);
}

export function getEventsByCategory(category: EventCategory): Event[] {
  return EVENTS.filter((event) => event.category === category);
}
