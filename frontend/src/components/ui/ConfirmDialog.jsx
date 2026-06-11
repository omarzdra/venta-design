import { Modal } from "./Modal";

export function ConfirmDialog({ title = "Potrdi akcijo", message, confirmLabel = "Potrdi", onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="form-actions">
        <button type="button" className="btn secondary" onClick={onCancel}>Preklici</button>
        <button type="button" className="btn secondary danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
