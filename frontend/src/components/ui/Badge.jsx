import { STATUS } from "../../constants/statuses";
import { cx } from "../../utils/formatters";

export function Badge({ value }) {
  return <span className={cx("badge", value)}>{STATUS[value] || value}</span>;
}
