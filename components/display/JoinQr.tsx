"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

/** 참가자 접속용 QR. 이 화면이 열린 주소의 홈("/")을 가리킨다. */
export function JoinQr({ size }: { size: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(`${window.location.origin}/`), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-surface p-6" style={{ width: size + 48, height: size + 48 }}>
        {url ? <QRCodeSVG value={url} size={size} level="M" title="참가자 접속 QR 코드" /> : null}
      </div>
      {url ? <p className="text-h1 text-stage-muted">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p> : null}
    </div>
  );
}
