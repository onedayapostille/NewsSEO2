import { Website } from '../types';

interface WebsiteDetailProps {
  website: Website;
  onBack: () => void;
}

export default function WebsiteDetail({ website, onBack }: WebsiteDetailProps) {
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={onBack} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer' }}>
        ← Back
      </button>
      <h2>{website.name}</h2>
      <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
        <p><strong>URL:</strong> {website.url}</p>
        <p><strong>Status:</strong> {website.status || 'Active'}</p>
        <p><strong>Created:</strong> {new Date(website.created_at).toLocaleString()}</p>
        {website.last_crawled_at && (
          <p><strong>Last Crawled:</strong> {new Date(website.last_crawled_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
