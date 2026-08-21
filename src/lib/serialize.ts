import type { Movie, Person, Place, WatchlistItem, WatchlistItemPerson, WatchlistItemPlace } from '@prisma/client';
import { posterUrl, trailerUrl } from '@/lib/tmdb';
import type { MovieDTO, PersonDTO, PersonWithFilmsDTO, PlaceDTO, WatchlistItemDTO } from '@/lib/types';

export function serializeMovie(movie: Movie): MovieDTO {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    year: movie.year,
    posterPath: posterUrl(movie.posterPath),
    overview: movie.overview,
    runtime: movie.runtime,
    releaseDate: movie.releaseDate,
    certification: movie.certification,
    trailerUrl: trailerUrl(movie.trailerKey),
  };
}

export function serializePerson(person: Person): PersonDTO {
  return { id: person.id, name: person.name, color: person.color };
}

export function serializePlace(place: Place): PlaceDTO {
  return { id: place.id, name: place.name, notes: place.notes };
}

type PersonWithItems = Person & {
  items: (WatchlistItemPerson & { watchlistItem: WatchlistItem & { movie: Movie } })[];
};

export function serializePersonWithFilms(person: PersonWithItems): PersonWithFilmsDTO {
  const films = person.items
    .map((i) => ({
      watchlistItemId: i.watchlistItem.id,
      status: i.watchlistItem.status as WatchlistItemDTO['status'],
      movie: serializeMovie(i.watchlistItem.movie),
    }))
    .sort((a, b) => a.movie.title.localeCompare(b.movie.title));
  return { ...serializePerson(person), films };
}

type FullWatchlistItem = WatchlistItem & {
  movie: Movie;
  people: (WatchlistItemPerson & { person: Person })[];
  places: (WatchlistItemPlace & { place: Place })[];
};

export function serializeWatchlistItem(item: FullWatchlistItem): WatchlistItemDTO {
  return {
    id: item.id,
    status: item.status as WatchlistItemDTO['status'],
    notes: item.notes,
    rating: item.rating,
    addedAt: item.addedAt.toISOString(),
    watchedAt: item.watchedAt ? item.watchedAt.toISOString() : null,
    movie: serializeMovie(item.movie),
    people: item.people.map((p) => ({ person: serializePerson(p.person) })),
    places: item.places.map((p) => ({ place: serializePlace(p.place) })),
  };
}
