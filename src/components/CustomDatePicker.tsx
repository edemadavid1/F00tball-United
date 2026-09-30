import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  label?: string;
  id?: string;
}

export function CustomDatePicker({ value, onChange, label, id }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse current value or default to today
  const parsedDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [currentYear, setCurrentYear] = useState(() => parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => parsedDate.getMonth()); // 0-indexed

  // Sync state if value changes from outside
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
    }
  }, [value]);

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!value) return "Select date";
    const [y, m, d] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return value;
  }, [value]);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-black tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {label}
        </label>
      )}
      
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-550 focus:outline-hidden bg-white shadow-xs transition-all duration-150 flex items-center justify-between text-left cursor-pointer hover:border-emerald-500/50"
      >
        <span className={value ? "text-slate-900 dark:text-slate-100 font-semibold" : "text-slate-400"}>
          {formattedDisplay}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {monthsList[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-600 text-white font-extrabold shadow-sm' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
