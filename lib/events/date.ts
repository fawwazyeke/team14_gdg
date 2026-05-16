import { addDays, format, nextSaturday, setHours, setMinutes } from "date-fns";

export function toDateParam(date: Date | string): string {
  return format(new Date(date), "yyyy-MM-dd");
}

export function toKtoDate(date: Date | string): string {
  return format(new Date(date), "yyyyMMdd");
}

export function defaultWindow() {
  const today = new Date();
  return {
    from: toDateParam(today),
    to: toDateParam(addDays(today, 30))
  };
}

export function nextSeedDate(offsetDays: number, hour: number, minute = 0): string {
  const date = addDays(nextSaturday(new Date()), offsetDays);
  return setMinutes(setHours(date, hour), minute).toISOString();
}

export function endAfter(startAt: string, hours: number): string {
  return new Date(new Date(startAt).getTime() + hours * 60 * 60 * 1000).toISOString();
}
