export function BracketConnector() {
  return (
    <div className="relative w-6 shrink-0 self-stretch">
      <div className="absolute top-1/4 bottom-1/4 right-0 w-px bg-border" />
      <div className="absolute top-1/4 right-0 h-px w-6 bg-border" />
      <div className="absolute bottom-1/4 right-0 h-px w-6 bg-border" />
    </div>
  );
}
