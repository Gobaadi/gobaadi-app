export const DEFAULT_DOCTOR_LOCATION = 'Uttar Badda, Dhaka';

/**
 * Extracts the area part of a selected location, e.g.
 * 'Uttar Badda, Dhaka' -> 'uttar badda', 'Old Dhaka' -> 'old dhaka'.
 */
export function areaOfLocation(location: string): string {
  return location.split(',')[0].trim().toLowerCase();
}

/**
 * Case-insensitive match of a doctor's location against the patient's
 * selected area. Handles free-text doctor locations like
 * 'Uttar Badda, Dhaka' or 'Clinic near Uttar Badda'.
 */
export function matchesDoctorLocation(
  doctorLocation: string | null | undefined,
  selectedLocation: string,
): boolean {
  const docLoc = (doctorLocation || '').trim().toLowerCase();
  if (!docLoc) return false;
  const area = areaOfLocation(selectedLocation);
  if (!area) return true;
  if (docLoc === selectedLocation.trim().toLowerCase()) return true;
  return docLoc.includes(area);
}
