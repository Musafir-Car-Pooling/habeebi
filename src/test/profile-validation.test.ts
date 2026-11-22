import { describe, expect, it } from "vitest";
import { audioExtension, canDeleteRequest, genderSchema, HELPLINE, mobileDigits, mobileSchema, signupSchema, UAE_CODE } from "@/lib/profile-validation";
import { PHOTO_MAX_BYTES, PHOTO_MAX_EDGE } from "@/lib/compress-photo";

describe("Habeebi registration rules", () => {
  it("keeps the UAE prefix separate from the 9 mobile digits", () => {
    expect(UAE_CODE).toBe("+971");
    expect(mobileDigits("+971501234567")).toBe("501234567");
  });
  it("accepts valid UAE mobile digits and rejects invalid length, prefix or characters", () => {
    expect(mobileSchema.safeParse("501234567").success).toBe(true);
    expect(mobileSchema.safeParse("551234567").success).toBe(true);
    for (const phone of ["50123456", "5012345678", "531234567", "50123456a", "+971501234567"]) expect(mobileSchema.safeParse(phone).success).toBe(false);
  });
  it("requires a gender at registration", () => {
    const input = { name: "Test", phone: "501234567", email: "test@example.com", password: "123456", gender: "male" };
    expect(signupSchema.safeParse(input).success).toBe(true);
    expect(signupSchema.safeParse({ ...input, gender: "" }).success).toBe(false);
    expect(genderSchema.safeParse("prefer_not_to_say").success).toBe(true);
  });
  it("continues accepting six digits or letters as passwords", () => {
    const input = { name: "Test", phone: "501234567", email: "test@example.com", gender: "female" };
    expect(signupSchema.safeParse({ ...input, password: "123456" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...input, password: "abcdef" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...input, password: "12345" }).success).toBe(false);
  });
});
describe("Launch controls", () => {
  it("only offers cancellation deletion to its owner", () => {
    expect(canDeleteRequest("cancelled", "owner", "owner")).toBe(true);
    expect(canDeleteRequest("open", "owner", "owner")).toBe(false);
    expect(canDeleteRequest("accepted", "owner", "owner")).toBe(false);
    expect(canDeleteRequest("cancelled", "owner", "other")).toBe(false);
  });
  it("caps compressed profile uploads to a small image budget", () => {
    expect(PHOTO_MAX_BYTES).toBe(81920);
    expect(PHOTO_MAX_EDGE).toBe(320);
  });
  it("keeps voice file extensions consistent with recorded formats", () => {
    expect(audioExtension("audio/mp4")).toBe("m4a");
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(audioExtension("audio/ogg")).toBe("ogg");
  });
  it("uses the requested UAE helpline", () => { expect(HELPLINE).toBe("+971 55 915 4785"); });
});
