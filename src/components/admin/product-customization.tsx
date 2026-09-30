"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import type { BatCustomization } from "@/db/schema";
import { BAT_WEIGHT_GROUPS, DEFAULT_BAT_SIZE, ENGRAVING_MAX, weightGroupName } from "@/lib/catalogue";
import { HANDLE_OPTIONS, PROFILE_OPTIONS, TOE_OPTIONS, WEIGHT_OPTIONS } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { EditorSection, FieldError, FieldHelp } from "./product-editor-fields";
import { CHIP, CHIP_OFF, CHIP_ON, FIELD_LABEL } from "./styles";

/**
 * An on/off row: a real checkbox with role="switch", so it posts "on" like
 * the rest of the form and reads as a switch. The track is black when on,
 * with the yellow knob of a selected state.
 */
export function Switch({
  name,
  label,
  help,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = `${name}-label`;
  const helpId = help ? `${name}-help` : undefined;
  return (
    <label className="relative flex min-h-14 cursor-pointer items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 flex-col">
        <span id={labelId} className="text-[15px] leading-[22px] font-semibold">
          {label}
        </span>
        {help && (
          <span id={helpId} className="text-[13px] leading-[18px] text-ink-muted">
            {help}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={labelId}
        aria-describedby={helpId}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-ink-subtle transition-colors peer-checked:bg-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-brand-yellow"
      >
        <span className="absolute top-[3px] left-[3px] size-[22px] rounded-full bg-surface-raised transition-transform" />
      </span>
    </label>
  );
}

/**
 * A group of round chips, each a checkbox posting its option under `name`.
 * `labels` gives the words for options that are codes ("SH" reads "SH / Full Size").
 */
export function ChipGroup({
  id,
  label,
  name,
  options,
  labels,
  chosen,
  onChange,
  invalid,
  errorId = "customization-error",
}: {
  id: string;
  label: string;
  name: string;
  options: string[];
  labels?: Record<string, string>;
  chosen: string[];
  onChange: (chosen: string[]) => void;
  invalid: boolean;
  /** The message the chips point at when `invalid`. */
  errorId?: string;
}) {
  function toggle(option: string, on: boolean) {
    // Keep the usual order, so turning an option off and on again is not a change.
    onChange(options.filter((entry) => (entry === option ? on : chosen.includes(entry))));
  }
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className={FIELD_LABEL}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = chosen.includes(option);
          return (
            <label
              key={option}
              className={cn(
                CHIP,
                on ? CHIP_ON : CHIP_OFF,
                "relative cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option}
                checked={on}
                onChange={(event) => toggle(option, event.target.checked)}
                aria-invalid={invalid ? true : undefined}
                aria-describedby={invalid ? errorId : undefined}
                className="sr-only"
              />
              {on && <Check className="size-4" strokeWidth={2} aria-hidden="true" />}
              {labels?.[option] ?? option}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="border-t border-border">{children}</div>;
}

/**
 * English Willow customization: whether customers can build this bat, and
 * which weights (of each size it is sold in), profiles, toes, handles and
 * extras they can pick. Posts customEnabled, customWeights, customProfiles,
 * customToes, customHandles, customEngraving, customMatchReady and
 * customScuffSheet (see parseProductForm).
 */
export function ProductCustomization({
  value,
  sizes,
  onChange,
  error,
}: {
  value: BatCustomization;
  /** The size codes the bat is sold in: each has weight ranges of its own. */
  sizes: string[];
  onChange: (value: BatCustomization) => void;
  error?: string;
}) {
  const set = (patch: Partial<BatCustomization>) => onChange({ ...value, ...patch });
  const invalid = Boolean(error);
  // One group of weight chips per size sold (SH and LH share one); with no size ticked yet, the bat sells in SH.
  const sold = sizes.length ? sizes : [DEFAULT_BAT_SIZE];
  const weightGroups = BAT_WEIGHT_GROUPS.filter((group) => group.sizes.some((code) => sold.includes(code)));
  /** One group's chips changed: the other sizes' ranges stay as they are. */
  const setWeights = (labels: string[], chosen: string[]) =>
    set({ weights: WEIGHT_OPTIONS.filter((label) => (labels.includes(label) ? chosen.includes(label) : value.weights.includes(label))) });

  return (
    <EditorSection id="custom-title" title="English Willow customization">
      <Switch name="customEnabled" label="Customization available" checked={value.enabled} onChange={(enabled) => set({ enabled })} />
      {value.enabled ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {weightGroups.map((group) => {
              const labels = group.weights.map((option) => option.label);
              return (
                <ChipGroup
                  key={group.sizes[0]}
                  id={`custom-weights-${group.sizes[0]}`}
                  label={weightGroups.length > 1 ? `Weight · ${weightGroupName(group, sold)}` : "Weight"}
                  name="customWeights"
                  options={labels}
                  chosen={value.weights}
                  onChange={(chosen) => setWeights(labels, chosen)}
                  invalid={invalid}
                />
              );
            })}
            <ChipGroup
              id="custom-profiles"
              label="Profile"
              name="customProfiles"
              options={PROFILE_OPTIONS}
              chosen={value.profiles}
              onChange={(profiles) => set({ profiles })}
              invalid={invalid}
            />
            <ChipGroup
              id="custom-toes"
              label="Toe shape"
              name="customToes"
              options={TOE_OPTIONS}
              chosen={value.toes}
              onChange={(toes) => set({ toes })}
              invalid={false}
            />
            <ChipGroup
              id="custom-handles"
              label="Handle shape"
              name="customHandles"
              options={HANDLE_OPTIONS}
              chosen={value.handles}
              onChange={(handles) => set({ handles })}
              invalid={invalid}
            />
            {error ? (
              <FieldError id="customization-error" message={error} />
            ) : (
              <FieldHelp>
                Customers pick from the options you keep selected.
                {weightGroups.length > 1 && " Each size has weight ranges of its own."}
              </FieldHelp>
            )}
          </div>
          <div className="flex flex-col">
            <Row>
              <Switch
                name="customEngraving"
                label="Name engraving"
                help={`Free · up to ${ENGRAVING_MAX} letters`}
                checked={value.engraving}
                onChange={(engraving) => set({ engraving })}
              />
            </Row>
            <Row>
              <Switch
                name="customMatchReady"
                label="Match ready preparation"
                checked={value.matchReady}
                onChange={(matchReady) => set({ matchReady })}
              />
            </Row>
            <Row>
              <Switch
                name="customScuffSheet"
                label="Clear scuff sheet"
                checked={value.scuffSheet}
                onChange={(scuffSheet) => set({ scuffSheet })}
              />
            </Row>
          </div>
        </div>
      ) : (
        <FieldHelp>Customers can&apos;t customize this bat.</FieldHelp>
      )}
    </EditorSection>
  );
}
