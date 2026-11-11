// 효과음. 음원 파일 없이 Web Audio API로 소리를 합성하므로 네트워크를 쓰지 않고 바로 난다.
// 소리를 낼 수 없는 환경(지원하지 않는 브라우저, 자동 재생 차단, 서버 렌더링)에서는 조용히 아무 일도 하지 않는다.
import { getStorageItem, setStorageItem } from "@/lib/storage";

export type SfxSoundType =
  | "invest_up"
  | "invest_down"
  | "limit_warning"
  | "step_transition"
  | "reveal_drumroll"
  | "reveal_fanfare";

/** 음소거 설정은 화면 종류별로 따로 기억한다. */
export type SfxScope = "display" | "mobile";

const STORAGE_KEYS: Record<SfxScope, string> = {
  display: "jumpup_sfx_muted_display",
  mobile: "jumpup_sfx_muted_mobile",
};

export interface SoundSnapshot {
  muted: boolean;
  /** 브라우저가 소리 재생을 허용한 상태인지(첫 터치·클릭 뒤에 true가 된다) */
  unlocked: boolean;
}

export interface SoundManager {
  getSnapshot(): SoundSnapshot;
  subscribe(listener: () => void): () => void;
  /** 저장된 음소거 설정을 읽고, 첫 터치·클릭에 소리가 켜지도록 준비한다. 브라우저에서 한 번 부른다. */
  arm(): void;
  /** 소리 재생을 허용받는다. 사용자 조작(클릭) 안에서 불러야 한다. 성공 여부를 돌려준다. */
  initAudioContext(): Promise<boolean>;
  play(sound: SfxSoundType): void;
  toggleMute(): boolean;
  setMuted(muted: boolean): void;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let contextFailed = false;

/** 모든 화면이 함께 쓰는 오디오 컨텍스트. 만들 수 없으면 null. */
function audioContext(): AudioContext | null {
  if (context || contextFailed || typeof window === "undefined") return context;
  try {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) {
      contextFailed = true;
      return null;
    }
    context = new Ctor();
  } catch (error) {
    // 소리는 부가 기능이므로 화면 동작을 멈추지 않는다. 한 번만 알리고 이후로는 재생을 건너뛴다.
    console.warn("[sfx] 오디오를 사용할 수 없어 효과음을 끕니다.", error);
    contextFailed = true;
  }
  return context;
}

/** 한 음: f0에서 f1로 미끄러지며 빠르게 커졌다가 사라진다. */
function tone(
  ctx: AudioContext,
  out: AudioNode,
  options: { type: OscillatorType; from: number; to?: number; start: number; duration: number; peak: number },
) {
  const { type, from, to = from, start, duration, peak } = options;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
  // 0에서 바로 켜고 끄면 딱 소리가 나므로 10ms에 걸쳐 올리고 끝에서 내린다.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(out);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** 드럼 한 타: 낮은 음이 빠르게 떨어지는 짧은 울림. */
function drumHit(ctx: AudioContext, out: AudioNode, start: number, peak: number) {
  tone(ctx, out, { type: "triangle", from: 150, to: 60, start, duration: 0.09, peak });
}

const NOTE = { C4: 261.63, E4: 329.63, G4: 392.0, C5: 523.25, E5: 659.25, G5: 783.99 };

const RECIPES: Record<SfxSoundType, (ctx: AudioContext, out: AudioNode, now: number) => void> = {
  invest_up: (ctx, out, now) => tone(ctx, out, { type: "sine", from: 587, to: 880, start: now, duration: 0.08, peak: 0.25 }),
  invest_down: (ctx, out, now) => tone(ctx, out, { type: "sine", from: 440, to: 330, start: now, duration: 0.08, peak: 0.25 }),
  limit_warning: (ctx, out, now) => tone(ctx, out, { type: "square", from: 140, start: now, duration: 0.12, peak: 0.18 }),
  step_transition: (ctx, out, now) => {
    tone(ctx, out, { type: "triangle", from: NOTE.C5, start: now, duration: 0.09, peak: 0.25 });
    tone(ctx, out, { type: "triangle", from: NOTE.E5, start: now + 0.08, duration: 0.12, peak: 0.25 });
  },
  // 1.5초 동안 점점 빨라지고 커지는 드럼 연타.
  reveal_drumroll: (ctx, out, now) => {
    let at = 0;
    while (at < 1.5) {
      const progress = at / 1.5;
      drumHit(ctx, out, now + at, 0.12 + 0.3 * progress);
      at += 0.09 - 0.045 * progress;
    }
  },
  // 도-미-솔-도 상승 뒤 화음으로 마무리하는 팡파레(약 1.8초).
  reveal_fanfare: (ctx, out, now) => {
    [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5].forEach((frequency, index) => {
      const start = now + index * 0.12;
      tone(ctx, out, { type: "sawtooth", from: frequency, start, duration: 0.16, peak: 0.16 });
      tone(ctx, out, { type: "triangle", from: frequency * 2, start, duration: 0.16, peak: 0.1 });
    });
    for (const frequency of [NOTE.C5, NOTE.E5, NOTE.G5]) {
      tone(ctx, out, { type: "sawtooth", from: frequency, start: now + 0.5, duration: 1.3, peak: 0.12 });
      tone(ctx, out, { type: "triangle", from: frequency / 2, start: now + 0.5, duration: 1.3, peak: 0.1 });
    }
  },
};

function createSoundManager(scope: SfxScope): SoundManager {
  let snapshot: SoundSnapshot = { muted: false, unlocked: false };
  let armed = false;
  const listeners = new Set<() => void>();

  function update(next: Partial<SoundSnapshot>) {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  }

  async function initAudioContext(): Promise<boolean> {
    const ctx = audioContext();
    if (!ctx) return false;
    try {
      if (ctx.state !== "running") await ctx.resume();
    } catch (error) {
      console.warn("[sfx] 소리 재생을 시작하지 못했습니다.", error);
    }
    const running = ctx.state === "running";
    if (running !== snapshot.unlocked) update({ unlocked: running });
    return running;
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    arm() {
      if (armed || typeof window === "undefined") return;
      armed = true;
      if (getStorageItem("local", STORAGE_KEYS[scope]) === "true") update({ muted: true });
      // 브라우저는 사용자의 첫 조작 전에는 소리를 막는다. 첫 터치·클릭·키 입력에 한 번 풀어 둔다.
      const unlock = () => void initAudioContext();
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
    },
    initAudioContext,
    play(sound) {
      if (snapshot.muted) return;
      const ctx = audioContext();
      // 아직 허용되지 않았으면 내지 않는다(허용 전 소리는 브라우저가 버리고 경고만 남긴다).
      if (!ctx || ctx.state !== "running") return;
      try {
        RECIPES[sound](ctx, ctx.destination, ctx.currentTime + 0.01);
      } catch (error) {
        console.warn("[sfx] 효과음 재생 실패", sound, error);
      }
    },
    setMuted(muted) {
      setStorageItem("local", STORAGE_KEYS[scope], String(muted));
      update({ muted });
    },
    toggleMute() {
      this.setMuted(!snapshot.muted);
      return snapshot.muted;
    },
  };
}

const managers = new Map<SfxScope, SoundManager>();

export function getSoundManager(scope: SfxScope): SoundManager {
  let manager = managers.get(scope);
  if (!manager) {
    manager = createSoundManager(scope);
    managers.set(scope, manager);
  }
  return manager;
}
