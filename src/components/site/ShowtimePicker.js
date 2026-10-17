"use client";

import { useMemo, useState } from "react";
import { toVnInputValue } from "@/lib/datetime";
import ShowtimeButton from "@/components/site/ShowtimeButton";

export default function ShowtimePicker({ days, showtimes }) {
  // Gắn thêm "ngày chiếu" (giờ Việt Nam) cho từng suất
  const items = useMemo(
    () => showtimes.map((s) => ({ ...s, dayKey: toVnInputValue(s.startTime).slice(0, 10) })),
    [showtimes]
  );

  const firstDayWithShows = days.find((d) => items.some((s) => s.dayKey === d.key))?.key ?? days[0].key;
  const [dayKey, setDayKey] = useState(firstDayWithShows);
  const [cinemaId, setCinemaId] = useState("");

  // Danh sách rạp có suất chiếu, gom theo khu vực
  const regions = useMemo(() => {
    const cinemas = new Map();
    for (const s of items) {
      if (!cinemas.has(s.cinemaId)) cinemas.set(s.cinemaId, { id: s.cinemaId, name: s.cinemaName, region: s.region });
    }
    const byRegion = new Map();
    for (const c of cinemas.values()) {
      if (!byRegion.has(c.region)) byRegion.set(c.region, []);
      byRegion.get(c.region).push(c);
    }
    return [...byRegion.entries()];
  }, [items]);

  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">Chưa có lịch chiếu trong 7 ngày tới.</p>;
  }

  // Suất của ngày đã chọn, gom theo rạp
  const visible = items.filter((s) => s.dayKey === dayKey && (!cinemaId || String(s.cinemaId) === cinemaId));
  const groups = new Map();
  for (const s of visible) {
    if (!groups.has(s.cinemaId)) groups.set(s.cinemaId, { name: s.cinemaName, address: s.cinemaAddress, list: [] });
    groups.get(s.cinemaId).list.push(s);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Chọn ngày */}
      <div className="flex flex-wrap gap-2">
        {days.map((d) => {
          const hasShows = items.some((s) => s.dayKey === d.key);
          const selected = d.key === dayKey;
          return (
            <button
              key={d.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setDayKey(d.key)}
              className={`flex min-w-24 flex-col items-center rounded border px-3 py-2 text-sm ${
                selected
                  ? "border-red-600 bg-red-600 text-white"
                  : hasShows
                    ? "border-neutral-600 hover:border-red-500"
                    : "border-neutral-800 text-neutral-600"
              }`}
            >
              <b>{d.label}</b>
              <span className="text-xs">{d.dateText}</span>
            </button>
          );
        })}
      </div>

      {/* Chọn rạp */}
      <label className="flex max-w-xs flex-col gap-1 text-sm">
        Rạp chiếu
        <select value={cinemaId} onChange={(e) => setCinemaId(e.target.value)} className="rounded border p-2">
          <option value="">Tất cả rạp</option>
          {regions.map(([region, cinemas]) => (
            <optgroup key={region} label={region}>
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {/* Danh sách suất theo rạp */}
      {groups.size === 0 ? (
        <p className="text-sm text-neutral-400">Không có suất chiếu trong ngày này.</p>
      ) : (
        [...groups.entries()].map(([id, g]) => (
          <div key={id} className="rounded-lg border border-neutral-800 p-4">
            <h3 className="font-semibold">{g.name}</h3>
            <p className="mb-3 text-xs text-neutral-400">{g.address}</p>
            <div className="flex flex-wrap gap-2">
              {g.list.map((s) => (
                <ShowtimeButton key={s.id} showtime={s} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}