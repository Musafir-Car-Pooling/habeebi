import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceRecorder } from "@/components/app/VoiceRecorder";

class FakeRecorder {
  static isTypeSupported(type: string) { return type.startsWith("audio/webm"); }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["audio"]) }); this.onstop?.(); }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Voice recorder lifecycle", () => {
  it("does not start recording if input is released before permission resolves", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    let resolvePermission: ((v: typeof stream) => void) | undefined;
    const getUserMedia = vi.fn(() => new Promise<typeof stream>((resolve) => { resolvePermission = resolve; }));
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const onChange = vi.fn();
    render(<VoiceRecorder value={null} onChange={onChange} />);
    const control = screen.getByRole("button", { name: "Hold to record voice note" });
    fireEvent.keyDown(control, { key: " " });
    fireEvent.keyUp(control, { key: " " });
    await act(async () => { resolvePermission?.(stream); });
    expect(stop).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
  it("saves audio once on release and stops the microphone", async () => {
    const stop = vi.fn();
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    const onChange = vi.fn();
    render(<VoiceRecorder value={null} onChange={onChange} />);
    const control = screen.getByRole("button", { name: "Hold to record voice note" });
    fireEvent.keyDown(control, { key: "Enter" });
    await waitFor(() => expect(control).toHaveAttribute("aria-pressed", "true"));
    fireEvent.keyUp(control, { key: "Enter" });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].size).toBeGreaterThan(0);
    expect(stop).toHaveBeenCalledOnce();
  });
  it("releases microphone and discards unfinished audio on unmount", async () => {
    const stop = vi.fn();
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    const onChange = vi.fn(); const view = render(<VoiceRecorder value={null} onChange={onChange} />);
    const control = screen.getByRole("button", { name: "Hold to record voice note" });
    fireEvent.keyDown(control, { key: "Enter" });
    await waitFor(() => expect(control).toHaveAttribute("aria-pressed", "true"));
    view.unmount(); expect(stop).toHaveBeenCalled(); expect(onChange).not.toHaveBeenCalled();
  });
});