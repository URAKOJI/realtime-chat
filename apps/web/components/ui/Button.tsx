import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = 'secondary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseClass =
    'rounded px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

  const variantClass: Record<ButtonVariant, string> = {
    primary:
      'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600',

    secondary:
      'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',

    danger:
      'border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950',

    ghost:
      'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white',

    accent:
      'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600',
  };

  return (
    <button
      className={`${baseClass} ${variantClass[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
