"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

import { StockStepper } from "./stock-stepper";
import { FIELD, FIELD_LABEL, SECTION_LABEL } from "./styles";

/** One editor section: a hairline, a small label, then its fields. Never a box. */
export function EditorSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border pt-5 pb-6">
      <h2 id={id} className={SECTION_LABEL}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A field's error, linked to it with aria-describedby. Focus moves to the field, so it is not an alert. */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

/** Grey help under a field. */
export function FieldHelp({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[13px] leading-[18px] text-ink-muted">
      {children}
    </p>
  );
}

function FieldLabel({ htmlFor, optional, children }: { htmlFor: string; optional?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={FIELD_LABEL}>
      {children}
      {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
    </label>
  );
}

/** The ids a field points at: its error when there is one, otherwise its help. */
function describedBy(id: string, help: ReactNode, error: string | undefined) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help && !error ? `${id}-help` : undefined;
  return { errorId, helpId, describedBy: errorId ?? helpId };
}

function FieldFooter({ id, help, error }: { id: string; help?: ReactNode; error?: string }) {
  const ids = describedBy(id, help, error);
  if (error) return <FieldError id={ids.errorId} message={error} />;
  return help ? <FieldHelp id={ids.helpId}>{help}</FieldHelp> : null;
}

interface FieldProps {
  id: string;
  label: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string;
}

type InputProps = Omit<ComponentProps<"input">, "id" | "value" | "onChange" | "className">;

/**
 * A labelled text input. `prefix` sits inside the field, e.g. "₹"; an
 * `aria-describedby` passed in (help shared by two fields) is added to the field's own.
 */
export function TextField({
  id,
  label,
  optional,
  help,
  error,
  value,
  onValueChange,
  prefix,
  "aria-describedby": sharedHelp,
  ...input
}: FieldProps & InputProps & { value: string; onValueChange: (value: string) => void; prefix?: string }) {
  const described = [describedBy(id, help, error).describedBy, sharedHelp].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-[13px] left-3 text-[15px] leading-[22px] text-ink-muted"
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          className={cn(FIELD, prefix && "pl-[30px] tabular-nums")}
          {...input}
        />
      </div>
      <FieldFooter id={id} help={help} error={error} />
    </div>
  );
}

/** A labelled multi-line field. */
export function TextAreaField({
  id,
  label,
  optional,
  help,
  error,
  value,
  onValueChange,
  ...textarea
}: FieldProps &
  Omit<ComponentProps<"textarea">, "id" | "value" | "onChange" | "className"> & {
    value: string;
    onValueChange: (value: string) => void;
  }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error).describedBy}
        className={cn(FIELD, "h-auto min-h-[92px] resize-y py-3")}
        {...textarea}
      />
      <FieldFooter id={id} help={help} error={error} />
    </div>
  );
}

/** A labelled native select with the admin's chevron. */
export function SelectField({
  id,
  label,
  help,
  error,
  name,
  value,
  onValueChange,
  options,
  placeholder,
}: FieldProps & {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  /** A first, unselectable choice such as "Choose a category". */
  placeholder?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, help, error).describedBy}
          className={cn(FIELD, "cursor-pointer appearance-none pr-10", !value && "text-ink-muted")}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-3.5 right-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <FieldFooter id={id} help={help} error={error} />
    </div>
  );
}

/**
 * The stock count with − and + beside it (the Inventory page's stepper), a
 * label and help. Empty means not counted.
 */
export function StockField({
  id,
  label,
  help,
  error,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  help: ReactNode;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="flex">
        <StockStepper
          id={id}
          name="stock"
          label="stock"
          hasVisibleLabel
          value={value}
          onChange={onValueChange}
          placeholder="–"
          invalid={Boolean(error)}
          describedBy={describedBy(id, help, error).describedBy}
        />
      </div>
      <FieldFooter id={id} help={help} error={error} />
    </div>
  );
}
