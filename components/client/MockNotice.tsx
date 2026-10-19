"use client";

import { useEffect, useState } from "react";
import { MOCK_WARNING_EVENT, USE_MOCK } from "../../lib/mock/config";

export default function MockNotice() {
  const [warning, setWarning] = useState("");
  useEffect(() => {
    if (!USE_MOCK) return;
    const update = () => {
      void import("../../lib/mock/store").then((store) =>
        setWarning(store.getMockWarning()),
      );
    };
    update();
    window.addEventListener(MOCK_WARNING_EVENT, update);
    return () => window.removeEventListener(MOCK_WARNING_EVENT, update);
  }, []);
  return warning ? (
    <div role="alert" className="mock-warning">
      {warning}
      <button
        type="button"
        onClick={() => setWarning("")}
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  ) : null;
}
