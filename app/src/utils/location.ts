/**
 * Extracts the area part of a selected location, e.g.
 * 'Uttar Badda, Dhaka' -> 'uttar badda', 'Old Dhaka' -> 'old dhaka'.
 */
export function areaOfLocation(location: string): string {
  return location.split(',')[0].trim().toLowerCase();
}

/**
 * Extracts the district part of a location (last comma segment), e.g.
 * 'Uttar Badda, Dhaka' -> 'dhaka', 'Narayanganj' -> 'narayanganj'.
 */
export function districtOfLocation(location: string): string {
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Patient-facing location filter for doctors.
 *
 * - Doctor has no location data           -> show (never hide on missing data)
 * - Exact match with the selected location -> show
 * - Doctor location contains the selected area -> show
 *   (handles free text like 'Clinic near Uttar Badda')
 * - Same district (last segment)          -> show ('Dhanmondi, Dhaka' matches
 *   a patient at 'Uttar Badda, Dhaka')
 * - Otherwise                              -> hide (different district)
 */
export function matchesDoctorLocation(
  doctorLocation: string | null | undefined,
  selectedLocation: string,
): boolean {
  const docLoc = (doctorLocation || '').trim().toLowerCase();
  if (!docLoc) return true;
  const selected = selectedLocation.trim().toLowerCase();
  if (!selected) return true;
  if (docLoc === selected) return true;
  const area = areaOfLocation(selectedLocation);
  if (area && docLoc.includes(area)) return true;
  const docDistrict = districtOfLocation(docLoc);
  const selDistrict = districtOfLocation(selectedLocation);
  return !!docDistrict && docDistrict === selDistrict;
}
