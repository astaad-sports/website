"use client";

import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { ArrowDown, ArrowUp, CircleAlert, Ellipsis, LoaderCircle, Play, Trash2, Video } from "lucide-react";

import { addVideo, deleteVideo, moveVideo, type ProductActionState } from "@/lib/products/admin-actions";
import { takeVideoPoster } from "@/lib/products/video-poster";
import {
  BLOB_VIDEO_FOLDER,
  MAX_VIDEO_MB,
  STORED_VIDEO_TYPES,
  storedVideoType,
  VIDEO_ACCEPT,
  videoProblem,
} from "@/lib/products/videos";
import { cn } from "@/lib/utils";

import { FieldHelp } from "./product-editor-fields";
import { BUTTON_BASE, BUTTON_SECONDARY, FIELD_LABEL, HAIRLINE_LIST } from "./styles";

/** A product video as the editor shows it. */
export interface EditorVideo {
  id: string;
  url: string;
  /** The still taken at upload, or null. */
  poster: string | null;
}

/** Where this deployment keeps uploads (see storage() in src/lib/products/storage.ts). */
export type VideoStorage = "blob" | "local" | null;

type VideoAction = (previous: ProductActionState, form: FormData) => Promise<ProductActionState>;
type VideoChange = { type: "move"; id: string; move: "up" | "down" } | { type: "delete"; id: string };
type Control = "open" | "up" | "down";

const UPLOAD_ROUTE = "/api/admin/product-videos";
const SOMETHING_WRONG = "Something went wrong. Try again.";
/** Above this, the Blob upload goes in parts, sent side by side and retried one by one. */
const MULTIPART_FROM = 8 * 1024 * 1024;

function applyChange(videos: EditorVideo[], change: VideoChange): EditorVideo[] {
  const from = videos.findIndex((video) => video.id === change.id);
  if (from < 0) return videos;
  if (change.type === "delete") return videos.filter((video) => video.id !== change.id);
  const to = change.move === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= videos.length) return videos;
  const next = [...videos];
  const [video] = next.splice(from, 1);
  next.splice(to, 0, video);
  return next;
}

function formOf(fields: Record<string, string | File>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

async function call(action: VideoAction, form: FormData): Promise<ProductActionState> {
  try {
    return await action({}, form);
  } catch {
    return { error: SOMETHING_WRONG };
  }
}

/** Send the file to this machine's local store, reporting progress (local development). */
function uploadLocally(file: File, onProgress: (percent: number) => void): Promise<{ url: string; pathname: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", UPLOAD_ROUTE);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      const body = request.response as {
        url?: string;
        pathname?: string;
        error?: string;
      } | null;
      if (request.status === 200 && body?.url && body.pathname) resolve({ url: body.url, pathname: body.pathname });
      else reject(new Error(body?.error ?? SOMETHING_WRONG));
    };
    request.onerror = () => reject(new Error("The upload stopped. Check the connection and try again."));
    request.send(file);
  });
}

/** Send the file straight to the Blob store, with a token from the upload route. */
async function uploadToStore(
  file: File,
  productId: string,
  onProgress: (percent: number) => void
): Promise<{ url: string; pathname: string }> {
  const type = storedVideoType(file) ?? "video/mp4";
  const blob = await uploadToBlob(`${BLOB_VIDEO_FOLDER}/${crypto.randomUUID()}.${STORED_VIDEO_TYPES[type]}`, file, {
    access: "public",
    handleUploadUrl: UPLOAD_ROUTE,
    clientPayload: productId,
    contentType: type,
    multipart: file.size > MULTIPART_FROM,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  return { url: blob.url, pathname: blob.pathname };
}

const controlId = (videoId: string, control: Control) => `video-${videoId}-${control}`;

/** A video's still, or a plain tile when it has none, with a play mark. */
function Thumb({ video, size }: { video: EditorVideo; size: 48 | 64 }) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-dark",
        size === 64 ? "size-16" : "size-12"
      )}
    >
      {video.poster ? (
        <Image src={video.poster} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Video className="size-5 text-on-dark-subtle" strokeWidth={1.5} aria-hidden="true" />
      )}
      <span className="absolute flex size-6 items-center justify-center rounded-full bg-surface-dark/80 text-on-dark">
        <Play className="size-3 translate-x-px fill-current" strokeWidth={2} aria-hidden="true" />
      </span>
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
 * The product's videos, which the product page shows after its photos. Each
 * uploads as it is, straight from the browser to the Blob store, with a
 * still taken from it first for the store to show until it plays. Tap a
 * video to watch it or delete it; the arrows reorder. Changes show at once.
 * Success messages go to the editor's single toast through `onSaved`.
 */
export function ProductVideos({
  productId,
  videos,
  storage,
  onSaved,
}: {
  productId: string;
  videos: EditorVideo[];
  storage: VideoStorage;
  onSaved: (message: string) => void;
}) {
  const [shown, showChange] = useOptimistic(videos, applyChange);
  /** "Uploading video… 40%" while a video uploads. */
  const [working, setWorking] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const addInput = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const confirmTitle = useRef<HTMLHeadingElement>(null);
  /** Where focus goes when the sheet closes, if not back to the video. */
  const afterClose = useRef<HTMLElement | null>(null);
  /** The arrow to keep focus on after a move, as the row changes place. */
  const refocus = useRef<{ id: string; control: Control } | null>(null);

  const selectedIndex = shown.findIndex((video) => video.id === selectedId);
  const selected = selectedIndex >= 0 ? shown[selectedIndex] : null;

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

  function run(action: VideoAction, form: FormData, change: VideoChange) {
    setErrors([]);
    startTransition(async () => {
      showChange(change);
      const result = await call(action, form);
      if (result.error) setErrors([result.error]);
      else if (result.saved) onSaved(result.saved);
    });
  }

  async function upload(files: File[]) {
    if (working || files.length === 0) return;
    if (!storage) {
      setErrors(["Video storage is not set up. Connect a Vercel Blob store to the project, then try again."]);
      return;
    }
    setErrors([]);
    const problems: string[] = [];
    let added = 0;
    for (const [index, file] of files.entries()) {
      const label = files.length === 1 ? "Uploading video…" : `Uploading ${index + 1} of ${files.length}…`;
      const problem = (message: string) => problems.push(files.length === 1 ? message : `${file.name}: ${message}`);
      const refused = videoProblem(file);
      if (refused) {
        problem(refused);
        continue;
      }
      setWorking(label);
      const poster = await takeVideoPoster(file);
      try {
        const progress = (percent: number) => setWorking(`${label} ${percent}%`);
        const stored =
          storage === "blob" ? await uploadToStore(file, productId, progress) : await uploadLocally(file, progress);
        setWorking(files.length === 1 ? "Saving video…" : `Saving ${index + 1} of ${files.length}…`);
        const result = await call(addVideo, formOf({ productId, ...stored, ...(poster ? { poster } : {}) }));
        if (result.error) problem(result.error);
        else added += 1;
      } catch (error) {
        problem(error instanceof Error && error.message ? error.message : SOMETHING_WRONG);
      }
    }
    setWorking(null);
    setErrors(problems);
    if (added) onSaved(added === 1 ? "Video added" : `${added} videos added`);
  }

  function browse() {
    if (!working) addInput.current?.click();
  }

  function close() {
    setSelectedId(null);
    setConfirming(false);
  }

  function move(video: EditorVideo, direction: "up" | "down") {
    refocus.current = { id: video.id, control: direction };
    run(moveVideo, formOf({ videoId: video.id, move: direction }), {
      type: "move",
      id: video.id,
      move: direction,
    });
  }

  function remove(video: EditorVideo, index: number) {
    const neighbour = shown[index + 1] ?? shown[index - 1];
    afterClose.current = neighbour ? document.getElementById(controlId(neighbour.id, "open")) : addButton.current;
    close();
    run(deleteVideo, formOf({ videoId: video.id }), { type: "delete", id: video.id });
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className={FIELD_LABEL}>Videos</h3>
      {shown.length > 0 ? (
        <ul className={HAIRLINE_LIST}>
          {shown.map((video, index) => {
            const position = `${index + 1} of ${shown.length}`;
            return (
              <li key={video.id} className="flex min-h-20 items-center gap-1 border-b border-border py-2">
                <button
                  id={controlId(video.id, "open")}
                  type="button"
                  onClick={() => {
                    afterClose.current = null;
                    setConfirming(false);
                    setSelectedId(video.id);
                  }}
                  aria-label={`Video ${position}, actions`}
                  className="-ml-1 flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm pr-2 pl-1 text-left transition-colors hover:bg-surface-sunken/60"
                >
                  <Thumb video={video} size={64} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] leading-[22px] font-semibold">Video {index + 1}</span>
                    <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{position}</span>
                  </span>
                  <Ellipsis className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  id={controlId(video.id, "up")}
                  type="button"
                  onClick={() => move(video, "up")}
                  disabled={index === 0}
                  aria-label={`Move video ${index + 1} up`}
                  className={ROW_ICON_BUTTON}
                >
                  <ArrowUp className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  id={controlId(video.id, "down")}
                  type="button"
                  onClick={() => move(video, "down")}
                  disabled={index === shown.length - 1}
                  aria-label={`Move video ${index + 1} down`}
                  className={ROW_ICON_BUTTON}
                >
                  <ArrowDown className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border-y border-border py-4 text-[13px] leading-[18px] text-ink-muted">No videos yet.</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          ref={addButton}
          type="button"
          onClick={browse}
          aria-disabled={Boolean(working)}
          className={cn(
            BUTTON_SECONDARY,
            "min-h-12 aria-disabled:cursor-progress aria-disabled:opacity-60 lg:self-start"
          )}
        >
          <Video aria-hidden="true" />
          Add videos
        </button>
        <FieldHelp>
          MP4, MOV or WebM, up to {MAX_VIDEO_MB} MB. They show after the photos on the product page and play without
          sound until the shopper turns it on. On an iPhone, set Camera, Formats to Most Compatible so they play on
          every phone.
        </FieldHelp>
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-[13px] leading-[18px] font-semibold tabular-nums",
            !working && "sr-only"
          )}
        >
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
        accept={VIDEO_ACCEPT}
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
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
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[100dvh] flex-col overflow-y-auto rounded-t-lg bg-surface-raised px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] text-foreground shadow-float outline-none",
              "lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-sm lg:p-5"
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
                    Delete this video?
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
                    It will be removed from the product.
                  </Dialog.Description>
                  <button
                    type="button"
                    onClick={() => remove(selected, selectedIndex)}
                    className={cn(BUTTON_BASE, "mt-4 min-h-12 bg-danger text-on-dark hover:bg-danger/90")}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete video
                  </button>
                  <Dialog.Close className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>Cancel</Dialog.Close>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex flex-col border-b border-border pb-3">
                    <Dialog.Title className="text-lg leading-6 font-semibold">Video {selectedIndex + 1}</Dialog.Title>
                    <Dialog.Description className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
                      {selectedIndex + 1} of {shown.length}
                    </Dialog.Description>
                  </div>
                  <video
                    key={selected.id}
                    src={selected.url}
                    poster={selected.poster ?? undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="my-3 max-h-[50dvh] w-full rounded-sm bg-surface-dark object-contain"
                  />
                  <ul className="flex flex-col border-t border-border">
                    <li className="border-b border-border">
                      <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className={cn(MENU_ITEM, "text-danger")}
                      >
                        <Trash2 strokeWidth={1.5} aria-hidden="true" />
                        Delete video
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
