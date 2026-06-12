export function EmptyState({ title = "Ni podatkov za prikaz.", children }) {
  return <div className="panel empty-side"><strong>{title}</strong>{children && <p className="muted">{children}</p>}</div>;
}
