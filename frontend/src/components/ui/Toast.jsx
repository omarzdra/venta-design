import { cx } from "../../utils/formatters";

export function Toast({ toast }) {
  return toast ? <div className={cx("toast", toast.type)}>{toast.message}</div> : null;
}
