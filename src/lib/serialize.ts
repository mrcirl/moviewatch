import type { Movie, Person, Place, WatchlistItem, WatchlistItemPerson, WatchlistItemPlace } from '@prisma/client';
import { posterUrl } from '@/lib/tmdb';
import type { MovieDTO, PersonDTO, PlaceDTO, WatchlistItemDTO } from '@/lib/types';

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
  };
}

export function serializePerson(person: Person): PersonDTO {
  return { id: person.id, name: person.name, color: person.color };
}

export function serializePlace(place: Place): PlaceDTO {
  return { id: place.id, name: place.name, notes: place.notes };
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
    addedAt: item.addedAt.toISOString(),
    watchedAt: item.watchedAt ? item.watchedAt.toISOString() : null,
    movie: serializeMovie(item.movie),
    people: item.people.map((p) => ({ person: serializePerson(p.person) })),
    places: item.places.map((p) => ({ place: serializePlace(p.place) })),
  };
}
