"use client";

import React from "react";
import { SocketProvider } from "@/context/SocketContext";
import { NotificationToast } from "./NotificationToast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <NotificationToast />
      {children}
    </SocketProvider>
  );
}
