import { afterEach, describe, expect, it, vi } from "vitest";
import { getStorageItem, setStorageItem } from "@/lib/storage";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("브라우저 저장소 래퍼", () => {
  it("서버(브라우저가 아닌 환경)에서는 읽으면 null, 쓰면 false다", () => {
    expect(getStorageItem("local", "key")).toBeNull();
    expect(setStorageItem("local", "key", "true")).toBe(false);
  });

  it("localStorage와 sessionStorage를 구분해 읽고 쓴다", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
    expect(setStorageItem("local", "key", "true")).toBe(true);
    expect(getStorageItem("local", "key")).toBe("true");
    expect(getStorageItem("session", "key")).toBeNull();
  });

  it("저장소 접근이 차단되어도 예외 없이 null·false를 돌려주고 경고만 남긴다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const blocked = {
      get localStorage(): Storage {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
      get sessionStorage(): Storage {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    };
    vi.stubGlobal("window", blocked);

    expect(getStorageItem("local", "key")).toBeNull();
    expect(setStorageItem("session", "key", "true")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("용량 초과 등으로 쓰기가 실패해도 예외를 던지지 않는다", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const full = memoryStorage();
    full.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    vi.stubGlobal("window", { localStorage: full, sessionStorage: full });
    expect(setStorageItem("local", "key", "true")).toBe(false);
  });
});
