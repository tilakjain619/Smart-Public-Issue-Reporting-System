import React, { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { Flame, MapPin } from "lucide-react";

// HeatmapLayer component to handle the leaflet.heat logic
const HeatmapLayer = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return;

        const heatLayer = L.heatLayer(points, {
            radius: 20,
            blur: 15,
            maxZoom: 13, // Matches the initial zoom level more closely
            minOpacity: 0.4,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
        }).addTo(map);

        // Force a redraw to ensure visibility
        heatLayer.redraw();

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
};

const MapUI = ({ issues }) => {
    const [mapInstance, setMapInstance] = useState(null);
    const [viewMode, setViewMode] = useState("markers"); // "markers" or "heatmap"

    const defaultLatitude = 19.95616816320774;
    const defaultLongitude = 73.82404782359492;

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                if (mapInstance) {
                    mapInstance.setView([latitude, longitude], 13);
                }
            });
        }
    };

    useEffect(() => {
        if (mapInstance) {
            getCurrentLocation();
        }
    }, [mapInstance]);

    // Prepare points for heatmap [lat, lng, intensity]
    const heatPoints = Array.isArray(issues) 
        ? issues
            .filter(issue => issue.coordinates?.latitude && issue.coordinates?.longitude)
            .map(issue => [
                issue.coordinates.latitude, 
                issue.coordinates.longitude, 
                0.5 // Default intensity
            ])
        : [];

    return (
        <div className="relative rounded-lg overflow-hidden border border-zinc-200">
            {/* View Toggle Overlay */}
            <div className="absolute top-4 right-4 z-[1000] flex bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden">
                <button
                    onClick={() => setViewMode("markers")}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                        viewMode === "markers" 
                        ? "bg-orange-500 text-white" 
                        : "bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                >
                    <MapPin className="w-4 h-4" />
                    Markers
                </button>
                <div className="w-[1px] bg-zinc-200" />
                <button
                    onClick={() => setViewMode("heatmap")}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                        viewMode === "heatmap" 
                        ? "bg-orange-500 text-white" 
                        : "bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                >
                    <Flame className="w-4 h-4" />
                    Heatmap
                </button>
            </div>

            <MapContainer
                center={[defaultLatitude, defaultLongitude]}
                zoom={13}
                style={{ height: "50vh", width: "100%" }}
                ref={setMapInstance}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {viewMode === "heatmap" ? (
                    <HeatmapLayer points={heatPoints} />
                ) : (
                    Array.isArray(issues) &&
                    issues.map((issue) => {
                        const { coordinates } = issue;
                        if (!coordinates) return null;

                        const statusIcons = {
                            "pending": new L.Icon({
                                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
                                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41],
                            }),
                            "in-progress": new L.Icon({
                                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
                                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41],
                            }),
                            "resolved": new L.Icon({
                                iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
                                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                                iconSize: [25, 41],
                                iconAnchor: [12, 41],
                                popupAnchor: [1, -34],
                                shadowSize: [41, 41],
                            }),
                        };

                        const markerIcon = statusIcons[issue.status] || statusIcons["pending"];

                        return (
                            <Marker
                                key={issue._id}
                                position={[coordinates.latitude, coordinates.longitude]}
                                icon={markerIcon}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <h4 className="font-bold text-zinc-800">{issue.title}</h4>
                                        <p className="text-xs text-zinc-500 mb-1">
                                            {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : "N/A"}
                                        </p>
                                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full font-bold ${
                                            issue.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {issue.status || "pending"}
                                        </span>
                                        {issue.imageUrl && (
                                            <img
                                                src={issue.imageUrl}
                                                alt="Issue"
                                                className="mt-2 rounded w-full h-24 object-cover"
                                            />
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })
                )}
            </MapContainer>
        </div>
    );
};

export default MapUI;
