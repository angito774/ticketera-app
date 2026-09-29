import {
  PRICE_RANGES,
  type EventFilters,
} from "@/modules/events/schemas/event-filters.schema";
import {
  EVENT_CATEGORY_LABELS,
  type Event,
  type EventCategory,
  type EventDetail,
} from "@/modules/events/types/event.types";

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

type EventExtraDetail = Omit<EventDetail, keyof Event>;

const EVENT_DETAILS: Record<Event["id"], EventExtraDetail> = {
  "concert-01": {
    description:
      "Bad Bunny llega a Lima con su gira mundial: más de dos horas de show con los éxitos de su último álbum, pantallas 360° y un escenario central que recorre todo el campo. La entrada incluye acceso a la zona elegida y a los puestos de comida del estadio.",
    doorsOpenAt: "2026-11-14T17:00:00-05:00",
    minAge: 12,
    address: "Calle José Díaz s/n, Cercado de Lima",
    layoutId: "stadium",
  },
  "concert-02": {
    description:
      "Gian Marco repasa sus canciones más queridas acompañado por la Orquesta Sinfónica Nacional, con nuevos arreglos pensados para el Gran Teatro Nacional. Un concierto íntimo de aproximadamente 100 minutos.",
    doorsOpenAt: "2026-10-03T20:00:00-05:00",
    minAge: null,
    address: "Av. Javier Prado Este 2225, San Borja",
    layoutId: "theater",
  },
  "concert-03": {
    description:
      "El festival de rock más grande del país vuelve a la Costa Verde con dos escenarios, más de 15 bandas nacionales e internacionales y zona de food trucks. Duración aproximada: 8 horas.",
    doorsOpenAt: "2026-11-28T15:00:00-05:00",
    minAge: 16,
    address: "Circuito de Playas s/n, Magdalena del Mar",
    layoutId: "stadium",
  },
  "concert-04": {
    description:
      "Wos presenta su gira latinoamericana en Arequipa: rap, rock y freestyle en vivo con banda completa. Show de aproximadamente 90 minutos.",
    doorsOpenAt: "2026-12-05T18:30:00-05:00",
    minAge: 14,
    address: "Av. Parra 300, Arequipa",
    layoutId: "stadium",
  },
  "concert-05": {
    description:
      "Una noche de boleros clásicos interpretados por una orquesta de 20 músicos y voces invitadas, en el Centro de Convenciones de Cusco.",
    doorsOpenAt: "2026-10-18T20:00:00-05:00",
    minAge: null,
    address: "Av. El Sol 604, Cusco",
    layoutId: "theater",
  },
  "concert-06": {
    description:
      "Selvámonos llega a Huancayo con un line-up de música alternativa, electrónica y fusión andina, en una jornada al aire libre de 10 horas.",
    doorsOpenAt: "2027-01-16T14:00:00-05:00",
    minAge: 16,
    address: "Av. Huancavelica 1000, Huancayo",
    layoutId: "stadium",
  },
  "theater-01": {
    description:
      "El musical más longevo de Broadway llega al Gran Teatro Nacional con una producción íntegramente en español, orquesta en vivo y la escenografía original. Duración: 2 h 30 min con intermedio.",
    doorsOpenAt: "2026-11-07T18:45:00-05:00",
    minAge: 7,
    address: "Av. Javier Prado Este 2225, San Borja",
    layoutId: "theater",
  },
  "theater-02": {
    description:
      "La Compañía Nacional de Teatro presenta una versión contemporánea de Hamlet, con un elenco de 12 actores. Duración: 2 h 10 min con intermedio.",
    doorsOpenAt: "2026-10-24T19:30:00-05:00",
    minAge: 14,
    address: "Jr. Ica 377, Cercado de Lima",
    layoutId: "theater",
  },
  "theater-03": {
    description:
      "El Ballet Municipal interpreta el clásico de Tchaikovsky con orquesta en vivo. Duración: 2 h con intermedio.",
    doorsOpenAt: "2026-12-12T18:15:00-05:00",
    minAge: null,
    address: "Calle Mercaderes 239, Arequipa",
    layoutId: "theater",
  },
  "theater-04": {
    description:
      "Cuatro comediantes, cero guion: una noche de stand up e improvisación con el público. Duración aproximada: 100 minutos.",
    doorsOpenAt: "2026-11-21T20:15:00-05:00",
    minAge: 18,
    address: "Jr. Pizarro 526, Trujillo",
    layoutId: "theater",
  },
};

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

export function getEventById(id: string): EventDetail | undefined {
  const event = EVENTS.find((item) => item.id === id);
  const detail = EVENT_DETAILS[id];
  if (!event || !detail) return undefined;
  return { ...event, ...detail };
}

export function getRelatedEvents(event: Event, limit = 4): Event[] {
  return EVENTS.filter(
    (item) => item.category === event.category && item.id !== event.id
  ).slice(0, limit);
}

/** Minúsculas y sin tildes, para comparar texto ("Ópera" ≈ "opera"). */
function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** "2026-11": las fechas mock están en hora de Lima, así que el mes sale del propio string. */
function monthKey(event: Event): string {
  return event.date.slice(0, 7);
}

export function searchEvents(filters: EventFilters): Event[] {
  const query = normalizeText(filters.q);
  const range = filters.price ? PRICE_RANGES[filters.price] : null;

  const results = EVENTS.filter((event) => {
    if (query && !normalizeText(`${event.title} ${event.venue} ${event.city}`).includes(query)) {
      return false;
    }
    if (filters.categories.length && !filters.categories.includes(event.category)) return false;
    if (filters.cities.length && !filters.cities.includes(event.city)) return false;
    if (filters.month && monthKey(event) !== filters.month) return false;
    // Rango (min, max]; el primer rango incluye el 0.
    if (range && !((range.min === 0 || event.price > range.min) && event.price <= range.max)) {
      return false;
    }
    return true;
  });

  return results.sort((a, b) =>
    filters.sort === "price"
      ? a.price - b.price || a.date.localeCompare(b.date)
      : new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export interface FacetOption<T extends string = string> {
  value: T;
  label: string;
  count: number;
}

export interface EventFacets {
  categories: FacetOption<EventCategory>[];
  cities: FacetOption[];
  months: FacetOption[];
}

const monthLabelFormatter = new Intl.DateTimeFormat("es-PE", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function monthLabel(key: string): string {
  const label = monthLabelFormatter.format(new Date(`${key}-15T12:00:00Z`)).replace(" de ", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}

/** Opciones de filtro con su cantidad de eventos (sobre el total, no sobre el resultado filtrado). */
export function getEventFacets(): EventFacets {
  const categoryCounts = countBy(EVENTS.map((event) => event.category));
  const cityCounts = countBy(EVENTS.map((event) => event.city));
  const monthCounts = countBy(EVENTS.map(monthKey));

  return {
    categories: (Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((category) => ({
      value: category,
      label: EVENT_CATEGORY_LABELS[category].plural,
      count: categoryCounts.get(category) ?? 0,
    })),
    cities: [...cityCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([city, count]) => ({ value: city, label: city, count })),
    months: [...monthCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ value: month, label: monthLabel(month), count })),
  };
}
