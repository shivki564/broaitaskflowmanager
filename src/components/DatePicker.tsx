import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1)
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update current month if the value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [value]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Grid calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
  const numDaysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { day: number; isCurrentMonth: boolean; dateStr: string; isSelected: boolean; isToday: boolean }[] = [];

  // Previous month padding
  const prevMonthNumDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthNumDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = formatDate(prevMonthDate);
    days.push({
      day: d,
      isCurrentMonth: false,
      dateStr,
      isSelected: dateStr === value,
      isToday: dateStr === formatDate(new Date())
    });
  }

  // Current month days
  for (let i = 1; i <= numDaysInMonth; i++) {
    const currentMonthDate = new Date(year, month, i);
    const dateStr = formatDate(currentMonthDate);
    days.push({
      day: i,
      isCurrentMonth: true,
      dateStr,
      isSelected: dateStr === value,
      isToday: dateStr === formatDate(new Date())
    });
  }

  // Next month padding to complete 42 cells (6 rows)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    const dateStr = formatDate(nextMonthDate);
    days.push({
      day: i,
      isCurrentMonth: false,
      dateStr,
      isSelected: dateStr === value,
      isToday: dateStr === formatDate(new Date())
    });
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(dateStr);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs bg-slate-950/80 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 hover:border-white/20 transition-all cursor-pointer text-left"
      >
        <span className="truncate">{formatDisplayDate(value)}</span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-900 border border-white/10 rounded-xl p-4 shadow-2xl w-72 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Days Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
              <span key={day} className="text-[10px] font-black uppercase text-slate-500">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((dayItem, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDayClick(dayItem.dateStr, e)}
                className={`h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  dayItem.isCurrentMonth
                    ? 'text-slate-200 hover:bg-indigo-600 hover:text-white'
                    : 'text-slate-600 hover:bg-white/5'
                } ${
                  dayItem.isSelected
                    ? '!bg-indigo-600 !text-white font-bold ring-2 ring-indigo-400/20'
                    : ''
                } ${
                  dayItem.isToday && !dayItem.isSelected
                    ? 'border border-indigo-500/50 text-indigo-400'
                    : ''
                }`}
              >
                {dayItem.day}
              </button>
            ))}
          </div>

          {/* Today Helper Button */}
          <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                const todayStr = formatDate(new Date());
                handleDayClick(todayStr, e);
              }}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
