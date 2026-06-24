import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Custom DivIcon styled marker
function makeIcon(label) {
  return L.divIcon({
    className: "",
    html: `<div class="pract-marker">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitBounds({ practitioners }) {
  const map = useMap();
  useEffect(() => {
    if (!practitioners?.length) return;
    const bounds = L.latLngBounds(practitioners.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [practitioners, map]);
  return null;
}

export default function MapView({ practitioners, selectedId, onSelect }) {
  const center = practitioners?.[0] ? [practitioners[0].lat, practitioners[0].lng] : [46.6, 2.5];
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border" data-testid="map-view">
      <MapContainer center={center} zoom={6} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {practitioners.map((p, i) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={makeIcon(i + 1)}
            eventHandlers={{ click: () => onSelect && onSelect(p.id) }}
          >
            <Popup>
              <div className="font-heading font-semibold text-[15px] text-[#1C2B28]">{p.name}</div>
              <div className="text-xs uppercase tracking-wider text-[#61726B] mt-0.5">{p.specialty}</div>
              <div className="text-xs text-[#61726B] mt-1.5">{p.address}</div>
              <a href={`/praticien/${p.id}`} className="inline-block mt-2 text-[#184B3D] font-semibold text-sm underline">Voir profil →</a>
            </Popup>
          </Marker>
        ))}
        <FitBounds practitioners={practitioners} />
      </MapContainer>
    </div>
  );
}
