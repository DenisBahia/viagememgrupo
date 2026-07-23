// Builds a colored, pin-shaped marker icon (with an emoji glyph and optional order badge)
// as an inline SVG data URL. This lets us use classic `Marker` instead of `AdvancedMarker`,
// which in turn lets us drop the map's `mapId`. Google Maps ignores the `styles` prop
// (used to hide default POI icons) whenever a `mapId` is present, since a Map ID's styling
// is meant to be managed in the Cloud Console instead. Avoiding `mapId` is what makes the
// "hide POIs that aren't in our list" styling actually take effect.
export function buildPinIcon(color: string, emoji: string, options?: { scale?: number; order?: number }): google.maps.Icon {
  const scale = options?.scale ?? 1;
  const width = 34 * scale;
  const height = 46 * scale;
  const order = options?.order;

  const badge = order
    ? `<circle cx="27" cy="9" r="8.5" fill="#1f2937" stroke="white" stroke-width="1.5" />
       <text x="27" y="12.5" font-size="10" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">${order}</text>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 29 17 29s17-17 17-29C34 7.6 26.4 0 17 0z" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="17" y="22" font-size="16" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">${emoji}</text>
      ${badge}
    </svg>`;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height),
  };
}

