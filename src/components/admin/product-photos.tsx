"use client";

import { startTransition, useEffect, useOptimistic, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowDown, ArrowUp, CircleAlert, Ellipsis, ImagePlus, LoaderCircle, RefreshCw, Star, Trash2 } from "lucide-react";

import {
  deletePhoto,
  movePhoto,
  replacePhoto,
  uploadPhoto,
  type ProductActionState,
} from "@/lib/products/admin-actions";
import { PHOTO_ACCEPT, shrinkImage } from "@/lib/products/shrink-image";
import { cn } from "@/lib/utils";

import { FieldHelp } from "./product-editor-fields";
import { BUTTON_BASE, BUTTON_SECONDARY, HAIRLINE_LIST } from "./styles";

/** A product photo as the editor shows it; the first is the primary one. */
export interface EditorPhoto {
  id: string;
  url: string;
}

type PhotoAction = (previous: ProductActionState, form: FormData) => Promise<ProductActionState>;
type Move = "first" | "up" | "down";
type PhotoChange = { type: "move"; id: string; move: Move } | { type: "delete"; id: string };
type Control = "open" | "up" | "down";

const SOMETHING_WRONG = "Something went wrong. Try again.";

/** The photos with a move or delete applied, as the server will have them. */
function applyChange(photos: EditorPhoto[], change: PhotoChange): EditorPhoto[] {
  const from = photos.findIndex((photo) => photo.id === change.id);
  if (from < 0) return photos;
  if (change.type === "delete") return photos.filter((photo) => photo.id !== change.id);
  const to = change.move === "first" ? 0 : change.move === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= photos.length || to === from) return photos;
  const next = [...photos];
  const [photo] = next.splice(from, 1);
  next.splice(to, 0, photo);
  return next;
}

function formOf(fields: Record<string, string | File>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

async function call(action: PhotoAction, form: FormData): Promise<ProductActionState> {
  try {
    return await action({}, form);
  } catch {
    return { error: SOMETHING_WRONG };
  }
}

const controlId = (photoId: string, control: Control) => `photo-${photoId}-${control}`;

function Thumb({ url, size }: { url: string; size: 48 | 64 }) {
  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden rounded-sm bg-surface-sunken",
        size === 64 ? "size-16" : "size-12"
      )}
    >
      <Image src={url} alt="" fill sizes={`${size}px`} className="object-contain p-1" />
    </span>
  );
}

function PrimaryBadge() {
  return (
    <span className="self-start rounded-xs bg-foreground px-1.5 text-[11px] leading-5 font-semibold tracking-[0.04em] text-on-dark">
      Primary
    </span>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

const MENU_ITEM =
  "flex min-h-14 w-full cursor-pointer items-center gap-3 py-2 text-left text-[15px] leading-[22px] font-semibold [&_svg]:size-5 [&_svg]:shrink-0";

const ROW_ICON_BUTTON =
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-ink-subtle disabled:hover:bg-transparent";

/**
 * The product's photos, primary first. Add them from the gallery or camera
 * (or drop them on desktop); each is shrunk in the browser, then uploaded one
 * at a time. Tap a photo to set it as primary, replace or delete it; the
 * arrows reorder. Moves and deletes show at once. Success messages go to the
 * editor's single toast through `onSaved`.
 */
export function ProductPhotos({
  productId,
  photos,
  onSaved,
}: {
  productId: string;
  photos: EditorPhoto[];
  onSaved: (message: string) => void;
}) {
  const [shown, showChange] = useOptimistic(photos, applyChange);
  /** "Uploading 2 of 3…" while photos upload. */
  const [working, setWorking] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState(false);

  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const confirmTitle = useRef<HTMLHeadingElement>(null);
  /** The photo a Replace is for, while the file picker is open. */
  const replacing = useRef<string | null>(null);
  /** Where focus goes when the photo sheet closes, if not back to the photo. */
  const afterClose = useRef<HTMLElement | null>(null);
  /** The arrow to keep focus on after a move, as the row changes place. */
  const refocus = useRef<{ id: string; control: Control } | null>(null);

  const selectedIndex = shown.findIndex((photo) => photo.id === selectedId);
  const selected = selectedIndex >= 0 ? shown[selectedIndex] : null;

  // A moved row can lose focus, and an arrow at the end becomes disabled: keep focus in the row.
  // Runs once the new order shows, not on the render that only clears old errors.
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const order: Control[] = [target.control, target.control === "up" ? "down" : "up", "open"];
    for (const control of order) {
      const element = document.getElementById(controlId(target.id, control));
      if (element instanceof HTMLButtonElement && !element.disabled) {
        element.focus();
        return;
      }
    }
  }, [shown]);

  useEffect(() => {
    if (confirming) confirmTitle.current?.focus();
  }, [confirming]);

  // A photo dropped just outside the drop zone would open in the tab, leaving the editor.
  useEffect(() => {
    function refuse(event: globalThis.DragEvent) {
      if (event.defaultPrevented || !event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "none";
    }
    window.addEventListener("dragover", refuse);
    window.addEventListener("drop", refuse);
    return () => {
      window.removeEventListener("dragover", refuse);
      window.removeEventListener("drop", refuse);
    };
  }, []);

  function report(result: ProductActionState) {
    if (result.error) setErrors([result.error]);
    else if (result.saved) onSaved(result.saved);
  }

  function run(action: PhotoAction, form: FormData, change: PhotoChange) {
    setErrors([]);
    startTransition(async () => {
      showChange(change);
      report(await call(action, form));
    });
  }

  async function upload(files: File[]) {
    if (working || files.length === 0) return;
    setErrors([]);
    const problems: string[] = [];
    let added = 0;
    let saved = "";
    for (const [index, file] of files.entries()) {
      setWorking(files.length === 1 ? "Uploading photo…" : `Uploading ${index + 1} of ${files.length}…`);
      const problem = (message: string) => problems.push(files.length === 1 ? message : `${file.name}: ${message}`);
      const shrunk = await shrinkImage(file);
      if (!shrunk.ok) {
        problem(shrunk.error);
        continue;
      }
      const result = await call(uploadPhoto, formOf({ productId, file: shrunk.file }));
      if (result.error) problem(result.error);
      else if (result.saved) {
        added += 1;
        saved = result.saved;
      }
    }
    setWorking(null);
    setErrors(problems);
    if (added) onSaved(added === 1 ? saved : `${added} photos added`);
  }

  async function replace(imageId: string, file: File) {
    if (working) return;
    setErrors([]);
    setWorking("Replacing photo…");
    const shrunk = await shrinkImage(file);
    const result = shrunk.ok ? await call(replacePhoto, formOf({ imageId, file: shrunk.file })) : { error: shrunk.error };
    setWorking(null);
    report(result);
  }

  function browse() {
    if (!working) addInput.current?.click();
  }

  function open(photoId: string) {
    afterClose.current = null;
    setConfirming(false);
    setSelectedId(photoId);
  }

  function close() {
    setSelectedId(null);
    setConfirming(false);
  }

  function move(photo: EditorPhoto, direction: "up" | "down") {
    refocus.current = { id: photo.id, control: direction };
    run(movePhoto, formOf({ imageId: photo.id, move: direction }), { type: "move", id: photo.id, move: direction });
  }

  function setPrimary(photo: EditorPhoto) {
    close();
    run(movePhoto, formOf({ imageId: photo.id, move: "first" }), { type: "move", id: photo.id, move: "first" });
  }

  function chooseReplacement(photo: EditorPhoto) {
    replacing.current = photo.id;
    replaceInput.current?.click();
    close();
  }

  function remove(photo: EditorPhoto, index: number) {
    // The row goes away, so focus moves to the next photo, or to adding one.
    const neighbour = shown[index + 1] ?? shown[index - 1];
    const addControl = addButton.current?.offsetParent ? addButton.current : browseButton.current;
    afterClose.current = neighbour ? document.getElementById(controlId(neighbour.id, "open")) : addControl;
    close();
    run(deletePhoto, formOf({ imageId: photo.id }), { type: "delete", id: photo.id });
  }

  function acceptsFiles(event: DragEvent) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  return (
    <div className="flex flex-col gap-4">
      {shown.length > 0 ? (
        <ul className={HAIRLINE_LIST}>
          {shown.map((photo, index) => {
            const position = `${index + 1} of ${shown.length}`;
            return (
              <li key={photo.id} className="flex min-h-20 items-center gap-1 border-b border-border py-2">
                <button
                  id={controlId(photo.id, "open")}
                  type="button"
                  onClick={() => open(photo.id)}
                  aria-label={index === 0 ? `Primary photo, ${position}, actions` : `Photo ${position}, actions`}
                  className="-ml-1 flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm pr-2 pl-1 text-left transition-colors hover:bg-surface-sunken/60"
                >
                  <Thumb url={photo.url} size={64} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {index === 0 ? (
                      <PrimaryBadge />
                    ) : (
                      <span className="text-[15px] leading-[22px] font-semibold">Photo {index + 1}</span>
                    )}
                    <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{position}</span>
                  </span>
                  <Ellipsis className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  id={controlId(photo.id, "up")}
                  type="button"
                  onClick={() => move(photo, "up")}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} up`}
                  className={ROW_ICON_BUTTON}
                >
                  <ArrowUp className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  id={controlId(photo.id, "down")}
                  type="button"
                  onClick={() => move(photo, "down")}
                  disabled={index === shown.length - 1}
                  aria-label={`Move photo ${index + 1} down`}
                  className={ROW_ICON_BUTTON}
                >
                  <ArrowDown className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border-y border-border py-4 text-[13px] leading-[18px] text-ink-muted">
          No photos yet. The store shows a default image until you add one.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          ref={addButton}
          type="button"
          onClick={browse}
          aria-disabled={Boolean(working)}
          className={cn(BUTTON_SECONDARY, "min-h-12 aria-disabled:cursor-progress aria-disabled:opacity-60 lg:hidden")}
        >
          <ImagePlus aria-hidden="true" />
          Add photos
        </button>
        <div
          onDragOver={(event) => {
            // While photos upload, the zone refuses more (the page-wide guard shows "not allowed").
            if (working || !acceptsFiles(event)) return;
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(Array.from(event.dataTransfer.files));
          }}
          className={cn(
            "hidden h-28 flex-col items-center justify-center gap-2 rounded-sm border-[1.5px] border-dashed text-center transition-colors lg:flex",
            dragging ? "border-foreground bg-surface-sunken" : "border-ink-subtle"
          )}
        >
          <ImagePlus className="size-6 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-sm leading-5">
            Drag photos here or{" "}
            <button
              ref={browseButton}
              type="button"
              onClick={browse}
              aria-disabled={Boolean(working)}
              className="-mx-0.5 cursor-pointer rounded-xs px-0.5 py-3 font-semibold underline underline-offset-2 aria-disabled:cursor-progress"
            >
              browse
            </button>
          </p>
        </div>
        <FieldHelp>JPG, PNG or WebP. Recommended: front, back, side, close-up and detail.</FieldHelp>
        <p role="status" className={cn("flex items-center gap-2 text-[13px] leading-[18px] font-semibold", !working && "sr-only")}>
          {working && <LoaderCircle className="size-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden="true" />}
          {working}
        </p>
        {errors.map((message, index) => (
          <ErrorLine key={index} message={message} />
        ))}
      </div>

      <input
        ref={addInput}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />
      <input
        ref={replaceInput}
        type="file"
        accept={PHOTO_ACCEPT}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          const imageId = replacing.current;
          event.target.value = "";
          replacing.current = null;
          if (file && imageId) void replace(imageId, file);
        }}
      />

      <Dialog.Root
        open={selected !== null}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-surface-dark/40" />
          <Dialog.Popup
            finalFocus={() => afterClose.current ?? true}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-lg bg-surface-raised px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] text-foreground shadow-float outline-none",
              "lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[400px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-sm lg:p-5"
            )}
          >
            <span aria-hidden="true" className="mb-3 h-1 w-9 self-center rounded-full bg-border lg:hidden" />
            {selected &&
              (confirming ? (
                <div className="flex flex-col">
                  <Dialog.Title
                    ref={confirmTitle}
                    tabIndex={-1}
                    className="text-lg leading-6 font-semibold outline-none"
                  >
                    Delete this photo?
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
                    {shown.length === 1
                      ? "It will be removed from the product. The store shows a default image until you add another."
                      : "It will be removed from the product."}
                  </Dialog.Description>
                  <button
                    type="button"
                    onClick={() => remove(selected, selectedIndex)}
                    className={cn(BUTTON_BASE, "mt-4 min-h-12 bg-danger text-on-dark hover:bg-danger/90")}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete photo
                  </button>
                  <Dialog.Close className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>Cancel</Dialog.Close>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b border-border pb-3">
                    <Thumb url={selected.url} size={48} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Dialog.Title className="text-lg leading-6 font-semibold">
                        {selectedIndex === 0 ? "Primary photo" : `Photo ${selectedIndex + 1}`}
                      </Dialog.Title>
                      <Dialog.Description className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
                        {selectedIndex + 1} of {shown.length}
                      </Dialog.Description>
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {selectedIndex > 0 && (
                      <li className="border-b border-border">
                        <button type="button" onClick={() => setPrimary(selected)} className={MENU_ITEM}>
                          <Star strokeWidth={1.5} aria-hidden="true" />
                          Set as primary photo
                        </button>
                      </li>
                    )}
                    <li className="border-b border-border">
                      <button type="button" onClick={() => chooseReplacement(selected)} className={MENU_ITEM}>
                        <RefreshCw strokeWidth={1.5} aria-hidden="true" />
                        Replace photo
                      </button>
                    </li>
                    <li className="border-b border-border">
                      <button type="button" onClick={() => setConfirming(true)} className={cn(MENU_ITEM, "text-danger")}>
                        <Trash2 strokeWidth={1.5} aria-hidden="true" />
                        Delete photo
                      </button>
                    </li>
                  </ul>
                  <Dialog.Close className={cn(BUTTON_SECONDARY, "mt-3 min-h-12")}>Cancel</Dialog.Close>
                </div>
              ))}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
