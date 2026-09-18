import type { ReactNode } from "react";

export function WindowPanel({
  title,
  children,
  status,
  className = "",
}: Readonly<{ title: ReactNode; children: ReactNode; status?: ReactNode; className?: string }>) {
  return (
    <section className={`window ${className}`.trim()}>
      <header className="title-bar">{title}</header>
      <div className="window-body">{children}</div>
      {status !== undefined && <footer className="status-bar">{status}</footer>}
    </section>
  );
}

export function StatusBadge({
  status,
  label = status,
}: Readonly<{ status: string; label?: string }>) {
  return <span className={`status ${status}`}>{label}</span>;
}

export function EmptyState({
  children,
  title = "Sin datos",
}: Readonly<{ children: ReactNode; title?: string }>) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function LoadingPanel({
  children = "Cargando información…",
}: Readonly<{ children?: ReactNode }>) {
  return (
    <div className="loading" role="status">
      {children}
    </div>
  );
}

export type DataGridColumn<Row> = Readonly<{
  key: string;
  label: string;
  render(row: Row): ReactNode;
}>;

export function DataGrid<Row>({
  rows,
  columns,
  rowKey,
  empty = "No hay registros.",
}: Readonly<{
  rows: readonly Row[];
  columns: readonly DataGridColumn<Row>[];
  rowKey(row: Row): string;
  empty?: ReactNode;
}>) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="table-empty">{empty}</div>}
    </div>
  );
}
