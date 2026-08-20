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
  addedAt: string;
  watchedAt: string | null;
  movie: MovieDTO;
  people: { person: PersonDTO }[];
  places: { place: PlaceDTO }[];
}
