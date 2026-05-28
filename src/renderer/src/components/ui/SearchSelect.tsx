import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SearchSelectProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  className?: string;
}

export function SearchSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  className = '',
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  useEffect(() => {
    // If the selected value changes from the outside, reset search
    if (value) {
      setSearch('');
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ target: { value: '' } });
    setSearch('');
  };

  const isElevated = isOpen || value !== '';

  return (
    <div className={`relative mt-2 ${isOpen ? 'z-50' : 'z-0'} ${className}`} ref={containerRef}>

      <div
        className={`flex h-12 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring ${
          disabled ? 'cursor-not-allowed opacity-50 bg-muted/20' : 'cursor-pointer'
        }`}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
      >
        <div className="flex-1 relative h-full pt-4">
          {isOpen ? (
            <input
              type="text"
              className="w-full bg-transparent outline-none border-0 p-0 text-sm h-7 text-foreground"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={disabled}
              autoFocus
            />
          ) : (
            <div className="text-sm truncate pr-6 text-foreground">
              {displayValue}
            </div>
          )}
          <label
            className={`absolute left-0 transition-all duration-200 pointer-events-none text-muted-foreground
              ${isElevated ? 'top-1 text-xs' : 'top-3 text-sm'}`}
          >
            {label}
          </label>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-y-auto animate-in fade-in duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-3.5 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between ${
                  opt.value === value ? 'bg-primary/10 text-primary font-medium' : ''
                }`}
              >
                <span>{opt.label}</span>
                {opt.value === value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
            ))
          ) : (
            <div className="px-3.5 py-3 text-xs text-muted-foreground text-center italic">
              No clients found matching "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
