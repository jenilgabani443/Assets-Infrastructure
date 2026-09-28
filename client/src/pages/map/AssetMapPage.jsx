import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import '../../utils/leafletConfig';
import {
  MapPin,
  Layers,
  Filter,
  Maximize2,
  RefreshCw,
  ExternalLink,
  Tag,
  CheckCircle,
  AlertTriangle,
  Clock,
  Boxes,
  Compass
} from 'lucide-react';
import api from '../../api/axios';
import { PageHeader, Card, Button, Badge, Spinner } from '../../components/ui';
import {
  formatCurrency,
  LIFECYCLE_STAGES,
  LIFECYCLE_STAGE_META
} from '../../utils';

// Stage color hex mapping
const STAGE_COLORS = {
  Planned: '#64748b',
  Procured: '#8b5cf6',
  Installed: '#3b82f6',
  'In Service': '#10b981',
  'Under Maintenance': '#f59e0b',
  Decommissioned: '#ef4444'
};

// Category color hex mapping
const CATEGORY_COLORS = {
  'Civil and Public Works': '#4f46e5',
  Utilities: '#0284c7',
  'Telecom and Network': '#059669',
  'Building Facilities': '#d97706',
  Transport: '#dc2626',
  'IT Assets': '#7c3aed'
};

const DEFAULT_CATEGORY_COLOR = '#6366f1';

// Custom marker icon creator
const createMarkerIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'custom-asset-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2.5px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="background-color: #ffffff; width: 6px; height: 6px; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
};

// Marker Cluster Layer component
function MarkerClusterLayer({ assets, colorMode, onFitBoundsReady }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create marker cluster group
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    clusterGroupRef.current = cluster;
    const bounds = L.latLngBounds();
    let hasCoords = false;

    assets.forEach((a) => {
      if (a.location?.lat && a.location?.lng) {
        const lat = Number(a.location.lat);
        const lng = Number(a.location.lng);

        if (!isNaN(lat) && !isNaN(lng)) {
          bounds.extend([lat, lng]);
          hasCoords = true;

          const color =
            colorMode === 'stage'
              ? STAGE_COLORS[a.lifecycleStage] || '#64748b'
              : CATEGORY_COLORS[a.category?.name] || DEFAULT_CATEGORY_COLOR;

          const icon = createMarkerIcon(color);
          const marker = L.marker([lat, lng], { icon });

          // Popup HTML content
          const popupContent = document.createElement('div');
          popupContent.className = 'font-sans p-1 text-slate-800 text-xs min-w-[210px]';
          popupContent.innerHTML = `
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
              <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #4338ca; background: #e0e7ff; padding: 1px 6px; border-radius: 4px;">
                ${a.assetTag || 'TAG'}
              </span>
              <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 4px 0 0 0; line-height: 1.2;">
                ${a.name}
              </h4>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #475569;">
              <div><strong>Category:</strong> ${a.category?.name || 'General'}</div>
              ${a.subcategory ? `<div><strong>Subcategory:</strong> ${a.subcategory}</div>` : ''}
              <div><strong>Stage:</strong> <span style="font-weight: 600; color: ${color};">${a.lifecycleStage}</span></div>
              ${a.cost ? `<div><strong>Cost:</strong> ₹${Number(a.cost).toLocaleString('en-IN')}</div>` : ''}
              ${a.location?.address ? `<div style="color: #64748b; font-size: 10px; margin-top: 2px;">📍 ${a.location.address}</div>` : ''}
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: right;">
              <a href="/assets/${a._id}" style="color: #4f46e5; font-weight: 700; text-decoration: none; font-size: 11px;">
                View Details &rarr;
              </a>
            </div>
          `;

          marker.bindPopup(popupContent);
          cluster.addLayer(marker);
        }
      }
    });

    map.addLayer(cluster);

    // Initial fit bounds if valid
    if (hasCoords && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    // Expose fit bounds callback
    if (onFitBoundsReady) {
      onFitBoundsReady(() => {
        if (hasCoords && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      });
    }

    return () => {
      map.removeLayer(cluster);
    };
  }, [map, assets, colorMode, onFitBoundsReady]);

  return null;
}

export default function AssetMapPage() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [colorMode, setColorMode] = useState('stage'); // 'stage' | 'category'
  const [legendOpen, setLegendOpen] = useState(true);

  const fitBoundsRef = useRef(null);

  // Fetch map assets & categories
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assetsRes, catRes] = await Promise.all([
        api.get('/assets/map'),
        api.get('/categories')
      ]);

      if (assetsRes.data?.success) {
        setAssets(assetsRes.data.data || []);
      }
      if (catRes.data?.success) {
        setCategories(catRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load map data:', err);
      setError(err.response?.data?.message || 'Could not load geographic assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (selectedCategory && a.category?._id !== selectedCategory) return false;
      if (selectedStage && a.lifecycleStage !== selectedStage) return false;
      return true;
    });
  }, [assets, selectedCategory, selectedStage]);

  // Surat/Default map center
  const defaultCenter = [21.1702, 72.8311];

  return (
    <div className="space-y-4 pb-8 flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex-shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary-600" />
            <span>Infrastructure GIS Map</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {filteredAssets.length} of {assets.length} assets
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Geographic placement and spatial clusters across municipal wards.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Color Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setColorMode('stage')}
              className={`px-3 py-1 rounded-lg transition-all ${
                colorMode === 'stage'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Stage
            </button>
            <button
              onClick={() => setColorMode('category')}
              className={`px-3 py-1 rounded-lg transition-all ${
                colorMode === 'category'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Category
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={Maximize2}
            onClick={() => fitBoundsRef.current?.()}
            title="Fit all markers in view"
          >
            Fit Bounds
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchData}
            title="Refresh assets"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTER CHIPS ROW */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2 flex-shrink-0 overflow-x-auto text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          <span>Category:</span>
        </span>
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            selectedCategory === ''
              ? 'bg-primary-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            onClick={() => setSelectedCategory(selectedCategory === c._id ? '' : c._id)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedCategory === c._id
                ? 'bg-primary-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {c.name}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 mx-2 hidden sm:block" />

        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>Stage:</span>
        </span>
        <button
          onClick={() => setSelectedStage('')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            selectedStage === ''
              ? 'bg-primary-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        {LIFECYCLE_STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStage(selectedStage === s ? '' : s)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedStage === s
                ? 'bg-primary-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* MAP VIEW CONTAINER */}
      <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0 min-h-[350px]">
        {loading ? (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xs flex items-center justify-center z-50">
            <Spinner size="lg" text="Loading GIS spatial clusters..." />
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center z-50 p-6">
            <div className="text-center max-w-sm">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800">Map Loading Error</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={fetchData}>
                Retry Loading
              </Button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterLayer
              assets={filteredAssets}
              colorMode={colorMode}
              onFitBoundsReady={(fn) => {
                fitBoundsRef.current = fn;
              }}
            />
          </MapContainer>
        )}

        {/* MAP LEGEND OVERLAY (BOTTOM LEFT) */}
        <div className="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-lg text-xs max-w-xs transition-all">
          <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-slate-100 mb-2">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              {colorMode === 'stage' ? 'Lifecycle Stages' : 'Asset Categories'}
            </span>
            <button
              onClick={() => setLegendOpen(!legendOpen)}
              className="text-[10px] text-primary-600 font-semibold"
            >
              {legendOpen ? 'Hide' : 'Show'}
            </button>
          </div>

          {legendOpen && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              {colorMode === 'stage'
                ? Object.entries(STAGE_COLORS).map(([stage, color]) => (
                    <div key={stage} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-slate-700 truncate">{stage}</span>
                    </div>
                  ))
                : Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-slate-700 truncate">{cat}</span>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
