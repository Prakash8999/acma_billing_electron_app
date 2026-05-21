import React, { useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, value, defaultValue, type = 'text', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    
    // Determine if the floating label should be elevated
    const isElevated = isFocused || (value !== undefined && value !== '') || (defaultValue !== undefined && defaultValue !== '');

    return (
      <div className="relative mt-2">
        <input
          type={type}
          className={`flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 pt-4 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
          placeholder={label}
        />
        <label
          className={`absolute left-3 transition-all duration-200 pointer-events-none text-muted-foreground
            ${isElevated ? 'top-1 text-xs' : 'top-3.5 text-sm'}`}
        >
          {label}
        </label>
      </div>
    );
  }
);
Input.displayName = 'Input';
