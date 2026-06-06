import { useEffect, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

const DEFAULT_CENTER = [28.6139, 77.209];

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function MapAutoCenter({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) {
      return;
    }

    map.setView([location.lat, location.lng], Math.max(map.getZoom(), 11));
  }, [location, map]);

  return null;
}

function circleStyleByDamage(damagePercentage) {
  if (damagePercentage > 75) {
    return { color: "#ef4444", radius: 2500 };
  }
  if (damagePercentage >= 40) {
    return { color: "#f59e0b", radius: 1700 };
  }
  return { color: "#22c55e", radius: 1000 };
}

export default function MapComponent({ location, onLocationSelect, popupText, damagePercentage, riskLevel }) {
  const [mounted, setMounted] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default || leaflet;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        });
        if (alive) {
          setMapReady(true);
        }
      } catch (error) {
        console.error("[MapComponent] Leaflet initialization failed", error);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!mounted || !mapReady) {
    return (
      <div className="mt-4 flex h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-[#051b31] text-sm text-white/70">
        Loading location map...
      </div>
    );
  }

  const center = location
    ? [location.lat, location.lng]
    : DEFAULT_CENTER;
  const { color, radius } = circleStyleByDamage(Number(damagePercentage) || 0);

  return (
    <div className="mt-4 h-[320px] overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={center}
        zoom={location ? 11 : 5}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        <MapAutoCenter location={location} />

        {location && (
          <>
            <Circle
              center={[location.lat, location.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.2 }}
            />
            <Marker position={[location.lat, location.lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{popupText || "Selected location"}</p>
                  <p>Damage: {damagePercentage != null ? `${damagePercentage}%` : "N/A"}</p>
                  <p>Risk: {riskLevel || "N/A"}</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}