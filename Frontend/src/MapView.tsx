import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Token ────────────────────────────────────────────────────────────────────
// Set your Mapbox public token in Frontend/.env as VITE_MAPBOX_TOKEN
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

// ─── Shared colour map ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  REPORTED: "#2567c3",
  IN_PROGRESS: "#2567c3",
  DEPARTMENT_CLOSED: "#df790f",
  VERIFIED_RESOLVED: "#27845e",
  REOPENED: "#cc3c44",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface IssueMarker {
  id: string;
  title: string;
  status: keyof typeof STATUS_COLOR;
  latitude: number;
  longitude: number;
  category?: string;
  distance_meters?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MiniMap  — small preview card on Dashboard / IssueDetails
// ─────────────────────────────────────────────────────────────────────────────
interface MiniMapProps {
  /** Centre the map on this point */
  latitude?: number;
  longitude?: number;
  /** Optional single marker to render at centre */
  markerStatus?: string;
  /** Show issues cluster when used on dashboard */
  issues?: IssueMarker[];
  height?: number;
  zoom?: number;
  onMarkerClick?: (issue: IssueMarker) => void;
}

export function MiniMap({
  latitude = 12.9692,
  longitude = 79.1559,
  markerStatus,
  issues = [],
  height = 285,
  zoom = 14,
  onMarkerClick,
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const addMarkers = useCallback(
    (map: mapboxgl.Map) => {
      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Issues cluster
      issues.forEach((issue) => {
        const el = document.createElement("div");
        el.className = "civic-marker";
        el.style.cssText = `
          width:32px;height:32px;border-radius:50% 50% 50% 4px;
          background:${STATUS_COLOR[issue.status] ?? "#2567c3"};
          border:3px solid white;
          box-shadow:0 3px 8px rgba(37,55,72,.35);
          cursor:pointer;transform:rotate(-45deg);
          display:grid;place-items:center;color:white;
          font-size:9px;font-weight:700;
        `;
        const inner = document.createElement("span");
        inner.style.transform = "rotate(45deg)";
        inner.textContent = issue.category?.[0]?.toUpperCase() ?? "•";
        el.appendChild(inner);

        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false })
          .setHTML(`
            <div style="font-family:DM Sans,sans-serif;padding:6px 2px;">
              <p style="margin:0 0 2px;font-size:9px;text-transform:uppercase;color:#718096;letter-spacing:.06em;">${issue.category ?? ""}</p>
              <strong style="font-size:13px;display:block;margin-bottom:4px;">${issue.title}</strong>
              <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;
                background:${STATUS_COLOR[issue.status]}20;color:${STATUS_COLOR[issue.status]};">
                ${issue.status.replace("_", " ")}
              </span>
              ${issue.distance_meters ? `<p style="margin:6px 0 0;font-size:11px;color:#718096;">${Math.round(issue.distance_meters)} m away</p>` : ""}
            </div>
          `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([issue.longitude, issue.latitude])
          .setPopup(popup)
          .addTo(map);

        if (onMarkerClick) {
          el.addEventListener("click", () => onMarkerClick(issue));
        }

        markersRef.current.push(marker);
      });

      // Single centre marker (IssueDetails view)
      if (issues.length === 0 && markerStatus) {
        const el = document.createElement("div");
        el.style.cssText = `
          width:36px;height:36px;border-radius:50% 50% 50% 4px;
          background:${STATUS_COLOR[markerStatus] ?? "#2567c3"};
          border:3px solid white;box-shadow:0 4px 12px rgba(37,55,72,.4);
          transform:rotate(-45deg);
        `;
        markersRef.current.push(
          new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map)
        );
      }
    },
    [issues, markerStatus, latitude, longitude, onMarkerClick]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [longitude, latitude],
      zoom,
      interactive: issues.length > 0, // non-interactive when just a location pin
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;
    map.on("load", () => addMarkers(map));
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers if issues change
  useEffect(() => {
    if (mapRef.current?.loaded()) addMarkers(mapRef.current);
  }, [addMarkers]);

  return (
    <div
      ref={containerRef}
      style={{ height, borderRadius: 8, overflow: "hidden", border: "1px solid #d4dde4" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FullMap  — full-page interactive map (CivicMap page)
// ─────────────────────────────────────────────────────────────────────────────
interface FullMapProps {
  issues?: IssueMarker[];
  onMarkerClick?: (issue: IssueMarker) => void;
  /** Draw a 500 m verification radius circle at this point */
  verificationCenter?: { lat: number; lng: number };
}

export function FullMap({
  issues = DEMO_ISSUES,
  onMarkerClick,
  verificationCenter,
}: FullMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [79.1559, 12.9692],
      zoom: 14.5,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;

    map.on("load", () => {
      // ── Verification radius circle ──────────────────────────────────────
      if (verificationCenter) {
        map.addSource("radius", {
          type: "geojson",
          data: createCircleGeoJSON(verificationCenter.lng, verificationCenter.lat, 500),
        });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#2567c3", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: { "line-color": "#2567c3", "line-width": 1.5, "line-dasharray": [4, 3] },
        });
      }

      // ── Issue markers ───────────────────────────────────────────────────
      const issuesToRender = issues.length ? issues : DEMO_ISSUES;
      issuesToRender.forEach((issue) => {
        const el = document.createElement("div");
        el.className = "civic-marker";
        el.style.cssText = `
          width:34px;height:34px;border-radius:50% 50% 50% 4px;
          background:${STATUS_COLOR[issue.status] ?? "#2567c3"};
          border:3px solid white;box-shadow:0 3px 10px rgba(37,55,72,.3);
          cursor:pointer;transform:rotate(-45deg);
          display:grid;place-items:center;color:white;
          font-size:9px;font-weight:700;
          transition:transform .15s;
        `;
        const inner = document.createElement("span");
        inner.style.transform = "rotate(45deg)";
        inner.textContent = issue.category?.[0]?.toUpperCase() ?? "•";
        el.appendChild(inner);

        el.addEventListener("mouseenter", () => { el.style.transform = "rotate(-45deg) scale(1.18)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "rotate(-45deg) scale(1)"; });

        const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: "220px" })
          .setHTML(`
            <div style="font-family:DM Sans,sans-serif;padding:6px 2px;">
              <p style="margin:0 0 2px;font-size:9px;text-transform:uppercase;color:#718096;letter-spacing:.06em;">${issue.category ?? ""}</p>
              <strong style="font-size:13px;line-height:1.3;display:block;margin-bottom:6px;">${issue.title}</strong>
              <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;
                background:${STATUS_COLOR[issue.status]}20;color:${STATUS_COLOR[issue.status]};">
                ${issue.status.replace(/_/g, " ")}
              </span>
            </div>
          `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([issue.longitude, issue.latitude])
          .setPopup(popup)
          .addTo(map);

        if (onMarkerClick) {
          el.addEventListener("click", () => onMarkerClick(issue));
        }

        markersRef.current.push(marker);
      });
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LocationPicker  — Report step 2 — click to place a pin
// ─────────────────────────────────────────────────────────────────────────────
interface LocationPickerProps {
  defaultLat?: number;
  defaultLng?: number;
  onLocationChange?: (lat: number, lng: number) => void;
}

export function LocationPicker({
  defaultLat = 12.9692,
  defaultLng = 79.1559,
  onLocationChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [defaultLng, defaultLat],
      zoom: 15,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Draggable marker
    const el = document.createElement("div");
    el.style.cssText = `
      width:38px;height:38px;border-radius:50% 50% 50% 4px;
      background:#2567c3;border:3px solid white;
      box-shadow:0 4px 14px rgba(37,55,72,.4);
      transform:rotate(-45deg);cursor:grab;
    `;
    const marker = new mapboxgl.Marker(el, { draggable: true })
      .setLngLat([defaultLng, defaultLat])
      .addTo(map);
    markerRef.current = marker;

    const report = () => {
      const { lng, lat } = marker.getLngLat();
      onLocationChange?.(lat, lng);
    };
    marker.on("dragend", report);

    // Click map to move pin
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onLocationChange?.(e.lngLat.lat, e.lngLat.lng);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative", height: 250, borderRadius: 8, overflow: "hidden", border: "1px solid #d4dde4", marginBottom: 12 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        background: "white", padding: "4px 12px", borderRadius: 20,
        fontSize: 11, fontWeight: 600, color: "#405064", boxShadow: "0 2px 8px rgba(0,0,0,.12)",
        pointerEvents: "none", whiteSpace: "nowrap",
      }}>
        Click or drag pin to set location
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Creates a GeoJSON polygon approximating a circle (for radius visualisation) */
type GeoJSONPolygonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};

function createCircleGeoJSON(
  lng: number,
  lat: number,
  radiusMeters: number,
  steps = 64
): GeoJSONPolygonFeature {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusMeters / earthRadius) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

/** Fallback demo pins shown when no real API data is available */
const DEMO_ISSUES: IssueMarker[] = [
  { id: "demo-1", title: "Streetlight out on Cedar Avenue", status: "DEPARTMENT_CLOSED", category: "Streetlight", latitude: 12.9695, longitude: 79.1552, distance_meters: 82 },
  { id: "demo-2", title: "Water leak near Oakridge Park", status: "REOPENED", category: "Water Leak", latitude: 12.9705, longitude: 79.1575, distance_meters: 210 },
  { id: "demo-3", title: "Overflowing bin on Main Road", status: "REPORTED", category: "Bin", latitude: 12.968, longitude: 79.158, distance_meters: 380 },
  { id: "demo-4", title: "Damaged signboard at crossroads", status: "VERIFIED_RESOLVED", category: "Signboard", latitude: 12.9675, longitude: 79.1540, distance_meters: 450 },
  { id: "demo-5", title: "Broken footpath near school", status: "IN_PROGRESS", category: "Footpath", latitude: 12.9710, longitude: 79.1560, distance_meters: 290 },
];
