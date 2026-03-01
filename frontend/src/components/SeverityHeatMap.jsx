import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { MapPin, ChevronLeft } from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const US_STATES_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// US state abbreviation -> FIPS (us-atlas states use FIPS as id)
const STATE_TO_FIPS = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", FL: "12", GA: "13",
  HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23", MD: "24",
  MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34",
  NM: "35", NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45",
  SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56",
};

// Severity index 0 (low) -> green, 1 (high) -> red
function getSeverityColor(severityIndex) {
  if (severityIndex == null || severityIndex === undefined) return "#E2E8F0";
  const r = Math.round(220 + (1 - severityIndex) * 35);
  const g = Math.round(38 + severityIndex * 180);
  const b = Math.round(38 + (1 - severityIndex) * 120);
  return `rgb(${r},${g},${b})`;
}

export function SeverityHeatMap({ heatmapGlobal = [], heatmapLocal = {}, categoryName, compact = false }) {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const severityByTopoId = useMemo(() => {
    const map = {};
    heatmapGlobal.forEach((r) => {
      const tid = r.topo_id ?? r.id;
      if (tid) map[String(tid)] = r;
    });
    return map;
  }, [heatmapGlobal]);

  const localRegions = selectedCountry && heatmapLocal[selectedCountry.id] ? heatmapLocal[selectedCountry.id] : [];

  // For US: map state id (e.g. TX) -> severity data; match to TopoJSON by FIPS
  const severityByStateFips = useMemo(() => {
    if (selectedCountry?.id !== "USA" || !localRegions.length) return {};
    const byFips = {};
    localRegions.forEach((r) => {
      const fips = STATE_TO_FIPS[r.id] || r.id;
      byFips[String(fips)] = r;
    });
    return byFips;
  }, [selectedCountry?.id, localRegions]);

  const isUsView = selectedCountry?.id === "USA" && localRegions.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
      <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-500" />
          Severity by region
        </h4>
        {selectedCountry ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSelectedCountry(null); }}
            className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            Back to world
          </button>
        ) : (
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor(0) }} />
              Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor(0.5) }} />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor(1) }} />
              High
            </span>
          </div>
        )}
      </div>

      {!selectedCountry ? (
        <div className={`relative ${compact ? "h-48" : "h-full min-h-[400px]"}`} style={{ background: "#f8fafc" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: compact ? 120 : 180 }}
            width={800}
            height={compact ? 240 : 480}
            style={{ width: "100%", height: "100%", maxHeight: compact ? 192 : "none" }}
          >
            <ZoomableGroup center={[0, 20]}>
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const tid = String(geo.id);
                    const data = severityByTopoId[tid];
                    const severity = data?.severity_index ?? null;
                    const fill = getSeverityColor(severity);
                    const name = geo.properties?.name ?? tid;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="#94a3b8"
                        strokeWidth={0.3}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", filter: "brightness(0.95)" },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={() =>
                          setTooltip(
                            data
                              ? `${name}: H ${data.high} / M ${data.medium} / L ${data.low} (severity ${((data.severity_index ?? 0) * 100).toFixed(0)}%)`
                              : name
                          )
                        }
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (data && heatmapLocal[data.id]) setSelectedCountry(data);
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
          {tooltip && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 pointer-events-none"
              style={{ position: "absolute" }}
            >
              {tooltip}
            </div>
          )}
        </div>
      ) : isUsView ? (
        <div className={`relative ${compact ? "h-48" : "h-full min-h-[400px]"}`} style={{ background: "#f8fafc" }}>
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: compact ? 400 : 800 }}
            width={800}
            height={compact ? 240 : 480}
            style={{ width: "100%", height: "100%", maxHeight: compact ? 192 : "none" }}
          >
            <Geographies geography={US_STATES_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const fips = String(geo.id);
                  const data = severityByStateFips[fips];
                  const severity = data?.severity_index ?? null;
                  const fill = getSeverityColor(severity);
                  const name = geo.properties?.name ?? data?.name ?? fips;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#94a3b8"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", filter: "brightness(0.95)" },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() =>
                        setTooltip(
                          data
                            ? `${name}: H ${data.high} / M ${data.medium} / L ${data.low} (severity ${((data.severity_index ?? 0) * 100).toFixed(0)}%)`
                            : name
                        )
                      }
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
          {tooltip && (
            <div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 pointer-events-none"
              style={{ position: "absolute" }}
            >
              {tooltip}
            </div>
          )}
          <p className="absolute top-2 left-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded">
            {selectedCountry.name} – severity by state ({categoryName})
          </p>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
            {selectedCountry.name} – local view ({categoryName})
          </p>
          <ul className="space-y-2">
            {localRegions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-300">{r.name}</span>
                <span
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: getSeverityColor(r.severity_index) }}
                  title={`Severity ${((r.severity_index ?? 0) * 100).toFixed(0)}%`}
                />
                <span className="text-xs text-slate-500">
                  H:{r.high} M:{r.medium} L:{r.low}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SeverityHeatMap;
