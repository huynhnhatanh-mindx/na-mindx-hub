export const formatDateTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';
  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    const trimmed = dateInput.trim();
    if (!trimmed) return '';
    const hasTimezone = trimmed.includes('Z') || /([+-]\d{2}:\d{2}|[+-]\d{2})$/.test(trimmed);
    d = new Date(hasTimezone ? trimmed : `${trimmed}:00+07:00`);
  }
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
