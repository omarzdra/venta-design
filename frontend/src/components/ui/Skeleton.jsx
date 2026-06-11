export function Skeleton({ lines = 3 }) {
  return <div className="skeleton">{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}
