import { useState, useEffect } from 'react';
import { formatDateRu, parseDateRu } from '../lib/dates';

interface DateRuInputProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

/** Функция `DateRuInput`. */
export function DateRuInput({
  value,
  onChange,
  placeholder = 'ДД.ММ.ГГГГ',
  className = '',
}: DateRuInputProps) {
  const [text, setText] = useState(value ? formatDateRu(value) : '');

  useEffect(() => {
    /** Функция `setText`. */
    setText(value ? formatDateRu(value) : '');
  }, [value]);

  /** Функция `commit`. */
  const commit = () => {
    if (!text.trim()) {
      onChange('');
      return;
    }
    const iso = parseDateRu(text);
    if (iso) {
      onChange(iso);
      setText(formatDateRu(iso));
    } else {
      /** Функция `setText`. */
      setText(value ? formatDateRu(value) : '');
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      placeholder={placeholder}
      className={className}
    />
  );
}
