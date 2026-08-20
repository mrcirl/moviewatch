import SearchClient from './search-client';

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-base-200">Search for a film</h1>
      <SearchClient />
    </div>
  );
}
