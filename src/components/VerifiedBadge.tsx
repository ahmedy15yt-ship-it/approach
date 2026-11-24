import React from 'react';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const dimClass =
    size === 'xs'
      ? 'w-3.5 h-3.5'
      : size === 'md'
      ? 'w-5 h-5'
      : size === 'lg'
      ? 'w-6 h-6'
      : 'w-4 h-4';

  return (
    <span
      className={`inline-flex items-center gap-1 select-none shrink-0 ${className}`}
      title="حساب موثق"
      aria-label="حساب موثق"
    >
      <svg
        viewBox="0 0 24 24"
        className={`${dimClass} shrink-0 drop-shadow-[0_1px_3px_rgba(29,155,240,0.45)]`}
        aria-hidden="true"
      >
        <path
          fill="#1D9BF0"
          d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"
        />
        <path
          fill="#FFFFFF"
          d="M10.54 16.2L6.8 12.46l1.41-1.42 2.33 2.33 5.29-5.3 1.41 1.42-6.7 6.71z"
        />
      </svg>
      {showLabel && (
        <span className="text-[11px] font-black text-[#1D9BF0]">حساب موثق</span>
      )}
    </span>
  );
};
