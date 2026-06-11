export default function Loader({ message = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}
