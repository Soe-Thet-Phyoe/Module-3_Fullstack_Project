import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return <nav aria-label="pagination" className={cn("pagination mx-auto flex w-full justify-center", className)} {...props} />;
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("pagination-content m-0 flex list-none flex-row flex-wrap items-center justify-center gap-2 p-0", className)} {...props} />;
}

function PaginationItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cn("pagination-item flex shrink-0", className)} {...props} />;
}

type PaginationLinkProps = ComponentProps<typeof Link> & { isActive?: boolean };

function PaginationLink({ className, isActive = false, ...props }: PaginationLinkProps) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "pagination-link inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 no-underline hover:bg-slate-50",
        isActive && "pagination-link-active border-blue-600 bg-blue-600 font-semibold text-white hover:bg-blue-700",
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link aria-label="Previous page" className={cn("pagination-link pagination-previous inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 no-underline hover:bg-slate-50", className)} {...props}>
      <ChevronLeft aria-hidden="true" size={16} />
      <span>Prev</span>
    </Link>
  );
}

function PaginationNext({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link aria-label="Next page" className={cn("pagination-link pagination-next inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 no-underline hover:bg-slate-50", className)} {...props}>
      <span>Next</span>
      <ChevronRight aria-hidden="true" size={16} />
    </Link>
  );
}

export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
