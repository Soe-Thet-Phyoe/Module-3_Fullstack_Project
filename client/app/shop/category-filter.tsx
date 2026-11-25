"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import type { ShopCategory } from "@/lib/shop-api";

export function CategoryFilter({ categories, selected, onChange }: { categories: ShopCategory[]; selected?: ShopCategory; onChange: (id: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="max-w-full" />}>
        Category <span className="truncate">{selected?.name ?? "All categories"}</span>
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-max max-w-[calc(100vw-2rem)]">
        <DropdownMenuRadioGroup aria-label="Category" value={selected?.id ?? ""} onValueChange={onChange}>
          <DropdownMenuRadioItem value="" closeOnClick>All categories</DropdownMenuRadioItem>
          {categories.map(({ id, name }) => (
            <DropdownMenuRadioItem key={id} value={id} closeOnClick><span className="break-words min-w-0">{name}</span></DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
