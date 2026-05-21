import React, { useState } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, value, defaultValue, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    // For select, it's always elevated if there's a selected value. Wait, actually if it's uncontrolled, we might just look at the DOM or assume it's elevated. 
    // Usually selects always show some value, but let's assume it works like floating label if empty value is supported.
    const isElevated = isFocused || (value !== undefined && value !== '') || (defaultValue !== undefined && defaultValue !== '');

    return (
      <div className="relative mt-2">
        <select
          className={`flex h-12 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pt-4 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus && props.onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur && props.onBlur(e);
          }}
          {...props}
        >
          <option value="" disabled hidden></option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label
          className={`absolute left-3 transition-all duration-200 pointer-events-none text-muted-foreground
            ${isElevated ? 'top-1 text-xs' : 'top-3.5 text-sm'}`}
        >
          {label}
        </label>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    );
  }
);
Select.displayName = 'Select';
