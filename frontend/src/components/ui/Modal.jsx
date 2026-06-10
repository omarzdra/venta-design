import { cx } from "../../utils/formatters";

export function Modal({ title, children, onClose, fullscreen = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className={cx("modal", fullscreen && "fullscreen")} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Zapri" onClick={onClose}>x</button>
        </div>
        {children}
      </section>
    </div>
  );
}
