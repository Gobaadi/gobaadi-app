interface AnimalInfo {
  animalBreed?: string;
  animalAge?: string;
  animalWeight?: string;
}

/**
 * Formats the animal info line as "breed · age · weight".
 * Appends "Kg" to the weight only when the stored value has no unit.
 */
export function formatAnimalDetails({
  animalBreed,
  animalAge,
  animalWeight,
}: AnimalInfo): string | null {
  const rawWeight = (animalWeight ?? '').trim();
  const weight = !rawWeight
    ? undefined
    : /[a-z]/i.test(rawWeight)
      ? rawWeight
      : `${rawWeight} Kg`;

  const text = [(animalBreed ?? '').trim(), (animalAge ?? '').trim(), weight]
    .filter((part): part is string => !!part)
    .join(' · ');
  return text || null;
}
