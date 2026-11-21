import { useEffect, useState } from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlurValidate?: (value: string) => string | null;
  disabled?: boolean;
  className?: string;
}

/** Поле времени: проверка только при потере фокуса, чтобы можно было допечатать «11» вместо «12». */
export function TimeInput({ value, onChange, onBlurValidate, disabled, className = '' }: TimeInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  /** Функция `commit`. */
  const commit = () => {
    if (draft === value) return;
    if (onBlurValidate) {
      const err = onBlurValidate(draft);
      if (err) {
        setDraft(value);
        return;
      }
    }
    onChange(draft);
  };

  return (
    <input
      type="time"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}
