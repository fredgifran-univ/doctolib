import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_LABEL_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

function formatHeader(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    day: DAYS_LABEL_FR[(d.getUTCDay() + 6) % 7],
    num: d.getUTCDate(),
    month: MONTHS_FR[d.getUTCMonth()],
  };
}

export default function Timetable({ availabilities, onSelect, disabled }) {
  const [page, setPage] = useState(0);
  const perPage = 5;
  const days = availabilities || [];
  const totalPages = Math.max(1, Math.ceil(days.length / perPage));
  const visible = days.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="bg-card border border-border rounded-2xl p-5" data-testid="timetable">
      <div className="flex items-center justify-between mb-4">
        <div className="font-heading text-lg font-semibold">Disponibilités</div>
        <div className="flex items-center gap-1">
          <button
            data-testid="timetable-prev"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            data-testid="timetable-next"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {visible.map((d) => {
          const h = formatHeader(d.date);
          return (
            <div key={d.date} className="text-center">
              <div className="pb-3 border-b border-border">
                <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-bold">{h.day}</div>
                <div className="font-heading text-xl font-semibold mt-0.5">{h.num}</div>
                <div className="text-xs text-muted-foreground">{h.month}</div>
              </div>
              <div className="mt-3 space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {d.slots.length === 0 && (
                  <div className="text-xs text-muted-foreground py-4">—</div>
                )}
                {d.slots.map((s) => (
                  <button
                    key={s.datetime}
                    data-testid={`slot-${s.datetime}`}
                    disabled={!s.available || disabled}
                    onClick={() => s.available && onSelect && onSelect(s)}
                    className={[
                      "w-full text-sm font-semibold py-2 rounded-lg transition-all",
                      s.available
                        ? "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                        : "bg-muted text-muted-foreground line-through cursor-not-allowed opacity-60",
                    ].join(" ")}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
