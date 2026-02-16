import { Globe, Trash2, Clock, ExternalLink } from 'lucide-react';
import { Website } from '../types';

interface DashboardProps {
  websites: Website[];
  onSelectWebsite: (id: string) => void;
  onDeleteWebsite: (id: string) => void;
}

export default function Dashboard({ websites, onSelectWebsite, onDeleteWebsite }: DashboardProps) {
  if (websites.length === 0) {
    return (
      <div className="text-center py-16">
        <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No websites added yet</h3>
        <p className="text-gray-500 mb-6">Add your first website to start analyzing SEO issues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Your Websites</h2>
        <span className="text-sm text-gray-500">{websites.length} website(s)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websites.map((website) => (
          <div
            key={website.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
          >
            <div 
              className="p-6"
              onClick={() => onSelectWebsite(website.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                {website.name || website.url}
              </h3>
              
              <a
                href={`https://${website.url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
              >
                <span className="truncate">{website.url}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>

              {website.last_crawled_at && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 mt-3">
                  <Clock className="w-3 h-3" />
                  <span>Last crawled: {new Date(website.last_crawled_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-1 rounded ${
                website.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {website.status || 'Active'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWebsite(website.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete website"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
