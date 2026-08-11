import { IconCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import { UploadImg } from "@/components/media/UploadImg";
import { useI18n } from "@/lib/i18n";
import { localFrameSender, sendDesignSelectionVia, type FrameSender } from "@/lib/ipc/approvals";
import type {
  DesignSelectionAction,
  DesignSelectionResponse,
  DesignTemplatePreview as Preview,
  DesignTemplateSelectionItem,
} from "@/lib/protocol/types";

type PreviewState = { status: "idle" | "loading" | "error" } | { status: "ready"; url: string };

export function createDesignTemplateBlobUrl(html: string): string {
  return URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
}

export function resolveDesignTemplatePreviewState(status: PreviewState["status"], hasFallback: boolean) {
  return {
    showHtml: status === "ready",
    showFallback: hasFallback && status !== "ready",
    showLoading: !hasFallback && (status === "idle" || status === "loading"),
    showError: !hasFallback && status === "error",
  };
}

/** Preview content is loaded only near the viewport. The iframe has an opaque origin:
 * allow-scripts is intentional, while allow-same-origin must never be added. */
function DesignTemplatePreview({
  title,
  preview,
  fallbackPath,
  uploadUrl,
  loadHtml,
}: {
  title: string;
  preview: Preview;
  fallbackPath?: string;
  uploadUrl?: (path: string) => Promise<string>;
  loadHtml?: (path: string) => Promise<string>;
}) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<PreviewState>({ status: "idle" });

  useEffect(() => {
    const node = host.current;
    if (!node || mounted) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setMounted(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || preview.type !== "html") return;
    if (!loadHtml) {
      setState({ status: "error" });
      return;
    }
    let alive = true;
    let objectUrl: string | undefined;
    setState({ status: "loading" });
    void loadHtml(preview.path).then(
      (html) => {
        if (!alive) return;
        try {
          objectUrl = createDesignTemplateBlobUrl(html);
          setState({ status: "ready", url: objectUrl });
        } catch {
          setState({ status: "error" });
        }
      },
      () => alive && setState({ status: "error" }),
    );
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [loadHtml, mounted, preview.path, preview.type]);

  const view = resolveDesignTemplatePreviewState(state.status, Boolean(fallbackPath && uploadUrl));
  return (
    <div ref={host} data-preview-state={preview.type === "html" ? state.status : undefined} className="pointer-events-none aspect-[4/3] w-full overflow-hidden bg-base-200">
      {mounted && preview.type === "image" && uploadUrl && (
        <UploadImg load={() => uploadUrl(preview.path)} alt={title} className="size-full object-cover" />
      )}
      {mounted && preview.type === "html" && view.showHtml && state.status === "ready" && (
        <iframe
          title={t("chat.design.dynamicPreview", { title })}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          src={state.url}
          tabIndex={-1}
          className="block size-full border-0"
        />
      )}
      {mounted && preview.type === "html" && view.showFallback && fallbackPath && uploadUrl && (
        <UploadImg load={() => uploadUrl(fallbackPath)} alt={title} className="size-full object-cover" />
      )}
      {mounted && preview.type === "html" && view.showLoading && (
        <span className="flex size-full items-center justify-center text-xs text-base-content/50">{t("chat.design.previewLoading")}</span>
      )}
      {mounted && preview.type === "html" && view.showError && (
        <span className="flex size-full items-center justify-center text-xs text-base-content/50">{t("chat.design.previewError")}</span>
      )}
    </div>
  );
}

function TerminalDesign({ item, response, unanswered }: { item: DesignTemplateSelectionItem; response?: DesignSelectionResponse; unanswered?: boolean }) {
  const { t } = useI18n();
  const action = response?.action ?? item.action;
  const selectedId = response?.selected_id ?? item.selectedId;
  const selected = item.items.find((candidate) => candidate.id === selectedId);
  let label = unanswered
    ? t("chat.design.unanswered")
    : item.state === "cancelled"
      ? t("chat.design.cancelled")
      : item.state === "expired"
        ? t("chat.design.expired")
        : t(`chat.design.action.${action ?? "cancel"}`);
  if (selected) label += ` · ${selected.title}`;
  if (item.reason) label += ` · ${item.reason}`;
  return (
    <div role="status" className="flex items-center justify-center gap-1.5 text-xs text-base-content/50">
      <IconCheck size={12} stroke={1.75} aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function DesignTemplateSelectionCard({
  item,
  sessionId,
  sendFrame,
  readonly,
  uploadUrl,
  loadHtml,
}: {
  item: DesignTemplateSelectionItem;
  sessionId: string;
  sendFrame?: FrameSender;
  readonly?: boolean;
  uploadUrl?: (path: string) => Promise<string>;
  loadHtml?: (path: string) => Promise<string>;
}) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>();
  const [refinement, setRefinement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState<DesignSelectionResponse>();

  if (item.state !== "open" || sent) return <TerminalDesign item={item} response={sent} />;
  if (readonly) return <TerminalDesign item={item} unanswered />;

  const send = sendFrame ?? localFrameSender(sessionId);
  // Duplicate request upserts keep the row/component mounted. A refreshed candidate set
  // must not let a now-stale local selection be submitted.
  const validSelectedId = item.items.some((candidate) => candidate.id === selectedId) ? selectedId : undefined;
  const submit = async (action: DesignSelectionAction) => {
    if (submitting || !item.allowedActions[action] || (action === "select" && !validSelectedId)) return;
    const text = refinement.trim();
    const response: DesignSelectionResponse = {
      request_id: item.requestId,
      action,
      ...(action === "select" && validSelectedId ? { selected_id: validSelectedId } : {}),
      ...(text ? { refinement_text: text } : {}),
    };
    setSubmitting(true);
    setFailed(false);
    try {
      await sendDesignSelectionVia(send, response);
      setSent(response);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };
  const selectable = item.allowedActions.select && !submitting;

  return (
    <section className="card card-border w-full max-w-[760px] overflow-hidden bg-base-100" aria-label={item.title || t("chat.design.title")}>
      <div className="flex min-w-0 flex-col gap-4 p-4">
        <header className="min-w-0">
          <h3 className="text-sm font-semibold">{item.title || t("chat.design.title")}</h3>
          {item.description && <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-base-content/60">{item.description}</p>}
        </header>
        <div className="grid min-w-0 grid-cols-2 items-stretch gap-3">
          {item.items.map((candidate) => {
            const active = selectedId === candidate.id;
            const preview = candidate.preview ?? (candidate.image ? { type: "image" as const, path: candidate.image } : undefined);
            return (
              <button
                key={candidate.id}
                type="button"
                disabled={!selectable}
                aria-pressed={active}
                className={`relative flex min-w-0 flex-col items-stretch overflow-hidden rounded-box border text-start ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-base-300 bg-base-100"} ${selectable ? "cursor-pointer transition-colors hover:border-base-content/30" : "cursor-default"}`}
                onClick={() => setSelectedId(candidate.id)}
              >
                {candidate.recommended && <span className="badge badge-primary badge-sm absolute end-1.5 top-1.5 z-10">{t("chat.design.recommended")}</span>}
                {preview ? (
                  <DesignTemplatePreview title={candidate.title} preview={preview} fallbackPath={preview.type === "html" ? candidate.image : undefined} uploadUrl={uploadUrl} loadHtml={loadHtml} />
                ) : <div className="aspect-[4/3] bg-base-200" />}
                <span className="flex min-w-0 flex-1 flex-col p-3">
                  <strong className="line-clamp-2 break-words text-xs font-semibold leading-snug">{candidate.title}</strong>
                  {candidate.description && <span className="mt-1 line-clamp-2 break-words text-xs leading-snug text-base-content/50">{candidate.description}</span>}
                  {candidate.reason && (
                    <span className="mt-2 line-clamp-3 break-words border-t border-base-200 pt-2 text-xs leading-snug text-base-content/70">
                      <strong>{t("chat.design.reason")}</strong>{candidate.reason}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {item.allowedActions.next && item.refinement?.enabled && (
          <input
            type="text"
            className="input input-sm relative z-0 w-full min-w-0 shrink-0 text-xs"
            value={refinement}
            disabled={submitting}
            aria-label={t("chat.design.refinement")}
            placeholder={item.refinement.placeholder || t("chat.design.refinement")}
            onChange={(event) => setRefinement(event.target.value)}
          />
        )}
        <footer className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 border-t border-base-300 pt-3">
          {failed && <span role="alert" className="me-auto text-xs text-error">{t("chat.design.submitFailed")}</span>}
          {item.allowedActions.cancel && <button type="button" className="btn btn-ghost btn-xs" disabled={submitting} onClick={() => void submit("cancel")}>{t("chat.design.cancel")}</button>}
          {item.allowedActions.direct && <button type="button" className="btn btn-ghost btn-xs" disabled={submitting} onClick={() => void submit("direct")}>{t("chat.design.direct")}</button>}
          {item.allowedActions.next && <button type="button" className="btn btn-outline btn-xs" disabled={submitting} onClick={() => void submit("next")}>{t("chat.design.next")}</button>}
          {item.allowedActions.select && <button type="button" className="btn btn-primary btn-sm" disabled={submitting || !validSelectedId} onClick={() => void submit("select")}>{submitting ? t("chat.design.submitting") : t("chat.design.select")}</button>}
        </footer>
      </div>
    </section>
  );
}
