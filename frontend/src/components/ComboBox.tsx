import React, { useState, useEffect, useRef } from 'react';

interface ComboBoxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function ComboBox({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = '', 
  required = false,
  disabled = false
}: ComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal state when the value prop changes from parent
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filter options based on typed input. Only filter if the user has typed something different from the selected value.
  const isFiltering = searchTerm !== value;
  const filteredOptions = isFiltering
    ? options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Close dropdown on click outside and preserve typed custom value
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          // Save the typed value when user clicks outside
          onChange(searchTerm);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, searchTerm, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelectOption = (option: string) => {
    onChange(option);
    setSearchTerm(option);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="form-group combobox-container" ref={containerRef}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: 'var(--error)', marginLeft: '4px' }}>*</span>}
      </label>
      
      <div className="combobox-input-wrapper">
        <input
          type="text"
          className="combobox-input"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
        />
        
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: '0px',
            top: '0px',
            height: '100%',
            width: '2.5rem',
            background: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            opacity: disabled ? 0.5 : 1
          }}
        >
          <svg
            className={`combobox-arrow ${isOpen ? 'open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      
      {isOpen && (
        <div className="combobox-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, idx) => (
              <div
                key={idx}
                className={`combobox-option ${option === value ? 'selected' : ''}`}
                onClick={() => handleSelectOption(option)}
              >
                {option}
              </div>
            ))
          ) : (
            // Option to use the typed text as a custom value
            searchTerm.trim() !== '' && (
              <div 
                className="combobox-option" 
                onClick={() => handleSelectOption(searchTerm)}
                style={{ fontStyle: 'italic' }}
              >
                Sử dụng "{searchTerm}"
              </div>
            )
          )}
          {filteredOptions.length === 0 && searchTerm.trim() === '' && (
            <div className="combobox-no-options">
              Không có lựa chọn nào
            </div>
          )}
        </div>
      )}
    </div>
  );
}
