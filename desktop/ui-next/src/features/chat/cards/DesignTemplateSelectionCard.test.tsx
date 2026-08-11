import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DesignTemplateSelectionItem } from "@/lib/protocol/types";
import { createDesignTemplateBlobUrl, DesignTemplateSelectionCard } from "./DesignTemplateSelectionCard";

const ITEM: DesignTemplateSelectionItem = {
  kind: "design-template-selection",
  requestId: "d1",
  title: "Visual direction",
  description: "Pick one",
  items: [
    { id: "clean", title: "Clean", image: "clean.png", recommended: true, reason: "Matches your brief" },
    { id: "live", title: "Live", image: "fallback.png", preview: { type: "html", path: "bundle/index.html" } },
    { id: "bold", title: "Bold", image: "bold.png" },
  ],
  allowedActions: { select: true, next: true, direct: true, cancel: true },
  refinement: { enabled: true },
  state: "open",
};

afterEach(() => vi.restoreAllMocks());

describe("DesignTemplateSelectionCard", () => {
  it("renders recommendation, trusted reason, optional refinement and all actions", () => {
    render(<DesignTemplateSelectionCard item={ITEM} sessionId="s1" sendFrame={vi.fn()} />);
    expect(screen.getByText("推荐")).toBeTruthy();
    expect(screen.getByText(/Matches your brief/)).toBeTruthy();
    const clean = screen.getByRole("button", { name: /Clean/ });
    expect(clean.className).toContain("flex");
    expect(clean.parentElement?.className).toContain("grid-cols-3");
    expect(clean.querySelector(".aspect-video")).toBeTruthy();
    expect(clean.querySelector("strong")?.className).toContain("line-clamp-1");
    expect(screen.getByText(/Matches your brief/).className).toContain("line-clamp-2");
    const refinement = screen.getByRole("textbox", { name: "补充你的设计条件（可选）" });
    expect(refinement.parentElement?.className).toContain("border-t");
    expect(refinement.parentElement?.previousElementSibling?.className).toContain("grid-cols-3");
    expect(screen.getByRole("button", { name: "选择" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "换一批" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "不使用模板" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "取消" })).toBeTruthy();
  });

  it("locks while sending, unlocks with retry on failure, then becomes terminal on success", async () => {
    let rejectFirst = true;
    const sender = vi.fn(async () => {
      if (rejectFirst) throw new Error("offline");
    });
    render(<DesignTemplateSelectionCard item={ITEM} sessionId="s1" sendFrame={sender} />);
    await userEvent.click(screen.getByRole("button", { name: /Clean/ }));
    const select = screen.getByRole("button", { name: "选择" });
    await userEvent.click(select);
    expect((await screen.findByRole("alert")).textContent).toContain("提交失败，请重试");
    expect((select as HTMLButtonElement).disabled).toBe(false);

    rejectFirst = false;
    await userEvent.click(select);
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("已选择 · Clean"));
    expect(sender).toHaveBeenLastCalledWith("design/selection/respond", { request_id: "d1", action: "select", selected_id: "clean" });
    expect(screen.queryByRole("button", { name: "选择" })).toBeNull();
  });

  it("renders open cards readonly without actions", () => {
    render(<DesignTemplateSelectionCard item={ITEM} sessionId="child" readonly />);
    expect(screen.getByRole("status").textContent).toContain("未答复");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("prefers reliable thumbnail images when HTML previews are also available", async () => {
    const uploadUrl = vi.fn(async (path: string) => `data:image/png;base64,${path}`);
    const loadHtml = vi.fn(async () => "<main>preview</main>");
    render(
      <DesignTemplateSelectionCard
        item={ITEM}
        sessionId="s1"
        sendFrame={vi.fn()}
        uploadUrl={uploadUrl}
        loadHtml={loadHtml}
      />,
    );
    await waitFor(() => expect(uploadUrl).toHaveBeenCalledTimes(3));
    expect(uploadUrl.mock.calls.map(([path]) => path)).toEqual(["clean.png", "fallback.png", "bold.png"]);
    expect(loadHtml).not.toHaveBeenCalled();
  });

  it("shows an error instead of a blank image preview when reading fails", async () => {
    render(
      <DesignTemplateSelectionCard
        item={{ ...ITEM, items: [ITEM.items[2]!] }}
        sessionId="s1"
        sendFrame={vi.fn()}
        uploadUrl={async () => { throw new Error("missing preview"); }}
      />,
    );
    expect(await screen.findByText("动态预览加载失败")).toBeTruthy();
  });

  it("creates UTF-8 HTML blobs and uses an opaque script sandbox when no thumbnail exists", async () => {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const { unmount } = render(
      <DesignTemplateSelectionCard
        item={{ ...ITEM, items: [{ ...ITEM.items[1]!, image: undefined }] }}
        sessionId="s1"
        sendFrame={vi.fn()}
        loadHtml={async () => "<script>window.previewRan=true</script>"}
      />,
    );
    await waitFor(() => expect(screen.getByTitle("Live 动态预览")).toBeTruthy());
    const iframe = screen.getByTitle("Live 动态预览");
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(create).toHaveBeenCalledOnce();
    const blob = create.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("text/html;charset=utf-8");
    expect(createDesignTemplateBlobUrl("<p>x</p>")).toBe("blob:preview");
    unmount();
    expect(revoke).toHaveBeenCalledWith("blob:preview");
  });
});
