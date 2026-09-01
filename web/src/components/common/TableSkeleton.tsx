interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="skeleton-table-row" aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              <span
                className="skeleton-block"
                style={{
                  width: column === 0 ? 'min(180px, 85%)' : `${55 + ((row + column) % 4) * 10}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only">
        <td colSpan={columns} role="status">Loading data</td>
      </tr>
    </>
  );
}
