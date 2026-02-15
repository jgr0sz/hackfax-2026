import React from 'react';
import MapComponent from '../components/MapComponent';
import ReportForm from '../components/ReportForm';

function MapPage() {
  const [selectedLocation, setSelectedLocation] = React.useState(null);

  return (
    <div className="flex flex-col h-screen">
      <main className="flex flex-1 overflow-hidden">
        {/* Map Section */}
        <div className="flex-grow">
          <MapComponent onLocationSelect={setSelectedLocation} />
        </div>

        {/* Report Form Section */}
        <aside className="w-96 bg-white shadow-lg">
          <ReportForm selectedLocation={selectedLocation} />
        </aside>
      </main>
    </div>
  );
}

export default MapPage;
