import { formatISO, parseISO } from "date-fns";

export function todayYmd() {
  return formatISO(new Date(), { representation: "date" });
}

export function parseYmdToDate(ymd) {
  // parseISO('YYYY-MM-DD') => Date at midnight local time; Prisma @db.Date ignores time.
  return parseISO(ymd);
}

export function isBeforeToday(ymd) {
  const t = todayYmd();
  return ymd < t;
}
