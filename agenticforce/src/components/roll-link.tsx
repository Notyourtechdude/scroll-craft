import { cn } from "@/lib/utils";

/** Label that rolls up to a duplicate of itself on hover. */
export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full group-focus-visible:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-out-expo group-hover:translate-y-0 group-focus-visible:translate-y-0"
      >
        {children}
      </span>
    </span>
  );
}
