"use client";

import "@xterm/xterm/css/xterm.css";
import { AlertCircle } from "lucide-react";
import { useTerminalSession } from "./terminal/useTerminalSession";
import { TerminalToolbar } from "./terminal/TerminalToolbar";
import { DistrolessBanner } from "./terminal/DistrolessBanner";

interface InteractiveTerminalProps {
  podName: string;
  namespace: string;
  containerName: string;
  contextName?: string;
  shell?: string;
  onShellChange?: (shell: string) => void;
  quickCommand?: string;
  onSwitchToRunner?: () => void;
  onOpenLogs?: () => void;
  containerList?: string[];
  onSelectContainer?: (container: string) => void;
}

export function InteractiveTerminal({
  podName,
  namespace,
  containerName,
  contextName,
  shell = "auto",
  onShellChange,
  quickCommand,
  onSwitchToRunner,
  onOpenLogs,
  containerList,
  onSelectContainer,
}: InteractiveTerminalProps) {
  const {
    containerRef,
    connectionStatus,
    errorMsg,
    isDistroless,
    setIsDistroless,
    reconnect,
    focusTerminal,
    sendSigint,
    clearScreen,
  } = useTerminalSession({
    podName,
    namespace,
    containerName,
    contextName,
    shell,
    quickCommand,
  });

  const handleReconnect = () => {
    setIsDistroless(false);
    reconnect();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080a0f] rounded-xl border border-white/[0.08] overflow-hidden shadow-inner relative">
      <TerminalToolbar
        containerName={containerName}
        podName={podName}
        shell={shell}
        onShellChange={onShellChange}
        connectionStatus={connectionStatus}
        onSigint={sendSigint}
        onClearScreen={clearScreen}
        onReconnect={handleReconnect}
        onFocusTerminal={focusTerminal}
      />

      {isDistroless && (
        <DistrolessBanner
          podName={podName}
          namespace={namespace}
          containerName={containerName}
          containerList={containerList}
          onSwitchToRunner={onSwitchToRunner}
          onOpenLogs={onOpenLogs}
          onSelectContainer={onSelectContainer}
        />
      )}

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        onClick={focusTerminal}
        className="flex-1 w-full h-full p-2 overflow-hidden cursor-text"
        style={{
          height: isDistroless ? "calc(100% - 100px)" : "calc(100% - 36px)",
        }}
      />

      {/* Error Banner if connection failed */}
      {connectionStatus === "error" && (
        <div className="absolute inset-x-4 bottom-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 backdrop-blur-md flex items-center justify-between text-xs text-rose-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              {errorMsg ||
                "Unable to establish interactive WebSocket shell session."}
            </span>
          </div>
          <button
            onClick={reconnect}
            className="px-2.5 py-1 rounded bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors text-xs cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
