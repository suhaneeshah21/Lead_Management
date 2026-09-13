const statusClass = {
  New: 'new',
  Contacted: 'contacted',
  'Site Visit': 'site-visit',
  Closed: 'closed',
};

export default function StatusBadge({ status }) {
  return <span className={`pill ${statusClass[status] || ''}`}>{status}</span>;
}
