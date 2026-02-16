import { Website } from '../types';

interface DashboardProps {
  websites: Website[];
  onSelectWebsite: (id: string) => void;
}

export default function Dashboard({ websites, onSelectWebsite }: DashboardProps) {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Websites Dashboard</h2>
      <div style={{ marginTop: '20px' }}>
        {websites.length === 0 ? (
          <p>No websites added yet. Click "Add Website" to get started.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {websites.map((website) => (
              <div
                key={website.id}
                onClick={() => onSelectWebsite(website.id)}
                style={{
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: 'white'
                }}
              >
                <h3>{website.name}</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>{website.url}</p>
                {website.last_crawled_at && (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                    Last crawled: {new Date(website.last_crawled_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
