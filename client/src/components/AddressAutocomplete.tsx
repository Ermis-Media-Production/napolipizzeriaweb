/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";

// ─── Manus Maps proxy config ──────────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY ?? "";
const FORGE_BASE_URL = (
  import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev"
).replace(/\/+$/, "");
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

// ─── Singleton script loader ──────────────────────────────────────────────────
let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: Array<() => void> = [];

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }
    loadCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      scriptLoading = false;
      loadCallbacks.forEach((cb) => cb()); // resolve anyway — fallback to manual input
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AddressComponents {
  streetAddress: string; // "123 Main St"
  city: string;
  state: string;          // "NV"
  zip: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface Props {
  value: string;
  onChange: (raw: string) => void;
  onSelect: (components: AddressComponents) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Street address *",
  hasError = false,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Maps script on mount
  useEffect(() => {
    setIsLoadingScript(true);
    loadGoogleMapsScript().then(() => {
      if (window.google?.maps?.places) {
        serviceRef.current = new window.google.maps.places.AutocompleteService();
        geocoderRef.current = new window.google.maps.Geocoder();
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        setIsReady(true);
      }
      setIsLoadingScript(false);
    });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch autocomplete predictions (debounced 300ms)
  const fetchPredictions = useCallback((input: string) => {
    if (!isReady || !serviceRef.current || input.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      serviceRef.current!.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current ?? undefined,
          componentRestrictions: { country: "us" },
          types: ["address"],
          // Bias toward Las Vegas metro area
          locationBias: new window.google.maps.Circle({
            center: { lat: 36.2481, lng: -115.2087 },
            radius: 50000, // 50km bias radius
          }),
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
            setSuggestions(predictions);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
            setShowDropdown(false);
          }
        }
      );
    }, 300);
  }, [isReady]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setIsSelected(false);
    fetchPredictions(val);
  };

  // Geocode a selected prediction to get lat/lng + address components
  const handleSelect = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!geocoderRef.current) return;
    setShowDropdown(false);
    setSuggestions([]);

    geocoderRef.current.geocode(
      { placeId: prediction.place_id },
      (results, status) => {
        if (status !== window.google.maps.GeocoderStatus.OK || !results?.length) return;

        const result = results[0];
        const comps = result.address_components ?? [];

        // Extract components
        const getComp = (type: string, short = false) =>
          comps.find((c) => c.types.includes(type))?.[short ? "short_name" : "long_name"] ?? "";

        const streetNumber = getComp("street_number");
        const route = getComp("route");
        const streetAddress = [streetNumber, route].filter(Boolean).join(" ");
        const city =
          getComp("locality") ||
          getComp("sublocality") ||
          getComp("neighborhood") ||
          getComp("administrative_area_level_2");
        const state = getComp("administrative_area_level_1", true); // "NV"
        const zip = getComp("postal_code");
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();

        // Refresh session token after a selection
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

        setIsSelected(true);
        onChange(streetAddress || prediction.structured_formatting.main_text);
        onSelect({
          streetAddress: streetAddress || prediction.structured_formatting.main_text,
          city,
          state,
          zip,
          lat,
          lng,
          formattedAddress: result.formatted_address,
        });
      }
    );
  }, [onChange, onSelect]);

  const borderColor = hasError
    ? "oklch(0.65 0.18 25)"
    : isSelected
    ? "oklch(0.55 0.15 145)"
    : "oklch(0.82 0.015 80)";

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          className="w-full text-xs px-3 py-2 rounded border outline-none focus:ring-1 pr-8"
          style={{
            borderColor,
            fontFamily: "'Lato', sans-serif",
            transition: "border-color 0.15s ease",
          }}
        />
        {/* Status icon */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoadingScript ? (
            <Loader2 size={12} className="animate-spin" style={{ color: "oklch(0.60 0.03 30)" }} />
          ) : isSelected ? (
            <CheckCircle2 size={12} style={{ color: "oklch(0.45 0.15 145)" }} />
          ) : (
            <MapPin size={12} style={{ color: "oklch(0.65 0.03 30)" }} />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
          style={{
            background: "white",
            borderColor: "oklch(0.82 0.015 80)",
            boxShadow: "0 4px 16px oklch(0.15 0.02 30 / 0.12)",
          }}
        >
          {suggestions.map((pred, i) => (
            <button
              key={pred.place_id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click fires
                handleSelect(pred);
              }}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
              style={{
                borderTop: i > 0 ? "1px solid oklch(0.92 0.01 80)" : "none",
              }}
            >
              <MapPin
                size={13}
                className="shrink-0 mt-0.5"
                style={{ color: "var(--napoli-red, #c0392b)" }}
              />
              <div className="min-w-0">
                <p
                  className="text-xs font-semibold truncate"
                  style={{ color: "oklch(0.25 0.04 30)", fontFamily: "'Lato', sans-serif" }}
                >
                  {pred.structured_formatting.main_text}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "oklch(0.55 0.03 30)", fontFamily: "'Lato', sans-serif" }}
                >
                  {pred.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          {/* Powered by Google attribution (required by ToS) */}
          <div
            className="px-3 py-1.5 flex items-center justify-end gap-1 border-t"
            style={{ borderColor: "oklch(0.92 0.01 80)", background: "oklch(0.98 0.005 80)" }}
          >
            <span className="text-[10px]" style={{ color: "oklch(0.60 0.02 30)" }}>
              Powered by Google
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
