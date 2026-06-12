export function InlineError({ message }) {
  if (!message) return null;
  return <div className="alert-inline">{message}</div>;
}
