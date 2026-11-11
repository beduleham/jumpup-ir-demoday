// 브라우저 저장소를 안전하게 읽고 쓴다.
// 서버 렌더링 중이거나 사생활 보호 모드 등으로 저장소가 막혀 있어도 예외를 던지지 않는다.
// 쓰지 못한 경우 false를 돌려주므로, 호출하는 쪽은 메모리 상태만으로 계속 동작하면 된다.

export type StorageKind = "local" | "session";

function storage(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  // 저장소가 차단된 브라우저는 속성에 접근하는 것만으로도 SecurityError를 던진다.
  return kind === "local" ? window.localStorage : window.sessionStorage;
}

export function getStorageItem(kind: StorageKind, key: string): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch (error) {
    console.warn(`[storage] ${key} 값을 읽지 못했습니다.`, error);
    return null;
  }
}

export function setStorageItem(kind: StorageKind, key: string, value: string): boolean {
  try {
    const target = storage(kind);
    if (!target) return false;
    target.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[storage] ${key} 값을 저장하지 못했습니다.`, error);
    return false;
  }
}
