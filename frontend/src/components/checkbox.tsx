interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
  size?: number;
}

export default function CustomCheckbox({ 
  checked, 
  onChange, 
  size = 5 
}: CustomCheckboxProps) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <input 
        type="checkbox" 
        checked={checked}
        onChange={onChange}
        className="
            w-5 h-5 
            rounded 
            border-2 
            border-gray-300 
            appearance-none
            checked:bg-green-500
            checked:border-green-500
            focus:outline-none
            cursor-pointer
            transition-colors
            duration-200
            relative
            z-10
        "
        />
      {checked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <svg 
            className="w-3.5 h-3.5 text-white"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
      )}
    </div>
  );
}