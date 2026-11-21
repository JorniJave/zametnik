interface ReminderMinutesInputProps {
  value: number | undefined;
  onChange: (minutes: number | undefined) => void;
  className?: string;
}

const PRESETS = [5, 10, 15, 30, 60, 120];

/** Функция `ReminderMinutesInput`. */
export function ReminderMinutesInput({ value, onChange, className = '' }: ReminderMinutesInputProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`px-2 py-0.5 rounded text-xs border ${
              value === m
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {m}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="px-2 py-0.5 rounded text-xs border border-[var(--border)] text-[var(--text-secondary)]"
          title="По умолчанию из настроек"
        >
          авто
        </button>
      </div>
      <input
        type="number"
        min={1}
        max={10080}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : Math.max(1, Number(v)));
        }}
        placeholder="Свой интервал, минут"
        className="w-full px-2 py-1.5 rounded-lg border bg-[var(--bg-secondary)] border-[var(--border)] text-sm"
      />
    </div>
  );
}
