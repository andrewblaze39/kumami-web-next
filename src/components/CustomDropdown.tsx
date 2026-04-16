'use client';

import { useState, useRef, useEffect } from 'react';
import { Triangle } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label?: string;
}

export default function CustomDropdown({ value, onChange, options, label }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="inline-flex items-center justify-between gap-2 px-4 py-2 border-2 border-[#96EDD6] rounded-2xl cursor-pointer hover:bg-[#96EDD6]/10 transition-colors min-w-[160px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-white font-black text-sm">
          {selectedOption?.label || label}
        </span>
        <Triangle
          className={`w-3 h-3 text-[#96EDD6] transition-transform duration-200 ${
            isOpen ? '' : 'rotate-180'
          }`}
          fill="currentColor"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[#2E6161] rounded-xl overflow-hidden shadow-lg z-50 min-w-[160px]">
          <div className="px-3 py-2 text-sm text-white border-b border-[#96EDD6]/30">
            Sort by
          </div>
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-1 cursor-pointer transition-colors text-md font-extrabold ${
                option.value === value
                  ? 'bg-[#96EDD6] text-[#102425]'
                  : 'text-white hover:bg-[#96EDD6]/20'
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
