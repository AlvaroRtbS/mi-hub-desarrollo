import { clasesCondicionales } from "@/lib/utilidades";

const claseInput =
  "w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 placeholder:text-neutral-600";

export function Campo({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-neutral-300 mb-1">{label}</span>
      {children}
      {hint && !error && (
        <span className="block text-xs text-neutral-500 mt-1">{hint}</span>
      )}
      {error && (
        <span className="block text-xs text-red-400 mt-1">{error}</span>
      )}
    </label>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clasesCondicionales(claseInput, className)} />;
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      {...props}
      className={clasesCondicionales(claseInput, "resize-y", className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={clasesCondicionales(claseInput, "pr-8", className)}>
      {children}
    </select>
  );
}
