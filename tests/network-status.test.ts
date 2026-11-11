import { describe, expect, it } from "vitest";
import { createNetworkMonitor } from "@/lib/network-status";

describe("네트워크 상태 감시", () => {
  it("브라우저가 끊김을 알리면 바로 오프라인이 되고 구독자에게 알린다", () => {
    const monitor = createNetworkMonitor(async () => true);
    let calls = 0;
    monitor.subscribe(() => {
      calls += 1;
    });
    monitor.handleOffline();
    expect(monitor.isOnline()).toBe(false);
    expect(calls).toBe(1);
    monitor.handleOffline();
    expect(calls).toBe(1);
  });

  it("브라우저가 연결을 알려도 서버에 닿을 때까지는 오프라인으로 둔다", async () => {
    let reachable = false;
    const monitor = createNetworkMonitor(async () => reachable);
    monitor.handleOffline();
    await monitor.verify();
    expect(monitor.isOnline()).toBe(false);
    reachable = true;
    await monitor.verify();
    expect(monitor.isOnline()).toBe(true);
  });

  it("연결 중에는 5번째 틱마다, 끊긴 동안에는 매 틱마다 확인한다", async () => {
    let probes = 0;
    let reachable = true;
    const monitor = createNetworkMonitor(async () => {
      probes += 1;
      return reachable;
    });
    for (let i = 0; i < 4; i += 1) await monitor.tick();
    expect(probes).toBe(0);
    reachable = false;
    await monitor.tick();
    expect(probes).toBe(1);
    expect(monitor.isOnline()).toBe(false);
    await monitor.tick();
    await monitor.tick();
    expect(probes).toBe(3);
    reachable = true;
    await monitor.tick();
    expect(monitor.isOnline()).toBe(true);
  });

  it("확인이 겹치면 한 번만 요청한다", async () => {
    let probes = 0;
    const monitor = createNetworkMonitor(async () => {
      probes += 1;
      return true;
    });
    await Promise.all([monitor.verify(), monitor.verify(), monitor.verify()]);
    expect(probes).toBe(1);
  });
});
