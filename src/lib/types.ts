export interface MovieDTO {
  id: number;
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  overview: string | null;
  runtime: number | null;
  releaseDate: string | null;
  certification: string | null;
  trailerUrl: string | null;
  imdbUrl: string | null;
  genres: string[];
}

export interface PersonDTO {
  id: number;
  name: string;
  color: string | null;
}

export interface PlaceDTO {
  id: number;
  name: string;
  notes: string | null;
}

export interface WatchlistItemDTO {
  id: number;
  status: 'WANT_TO_WATCH' | 'WATCHED';
  notes: string | null;
  rating: number | null;
  addedAt: string;
  watchedAt: string | null;
  movie: MovieDTO;
  people: { person: PersonDTO; watched: boolean }[];
  places: { place: PlaceDTO }[];
}

export interface PersonWithFilmsDTO extends PersonDTO {
  films: { watchlistItemId: number; status: WatchlistItemDTO['status']; watched: boolean; movie: MovieDTO }[];
}
