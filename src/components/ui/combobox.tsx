import { useState, type ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: readonly string[];
  placeholder?: string;
  emptyText?: string;
  /** Offer a free-text entry when nothing in the list matches. */
  allowCustom?: boolean;
  /** Show a "Clear" action so an optional preference can be removed. */
  clearable?: boolean;
  id?: string;
}

/**
 * Searchable single-select built on cmdk + Radix Popover.
 *
 * Filtering is done here rather than by cmdk so the "use what I typed"
 * option can be offered alongside the matches (cmdk would filter it out
 * unless its value happened to equal the raw query).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyText = "No matches.",
  allowCustom = true,
  clearable = true,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q))
    : [...options];
  const exactMatch = options.some((o) => o.toLowerCase() === q);
  const showCustom = allowCustom && q.length > 0 && !exactMatch;

  function choose(next: string | null) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList id={id ? `${id}-listbox` : undefined}>
            {filtered.length === 0 && !showCustom && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {showCustom && (
              <CommandGroup>
                <CommandItem
                  value={`__custom__${q}`}
                  onSelect={() => choose(query.trim())}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Use “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => choose(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {clearable && value && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => choose(null)}
                  className="text-muted-foreground"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Clear
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** Label + control + optional hint, matching the profile form's Row shape. */
export function ComboboxField({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
