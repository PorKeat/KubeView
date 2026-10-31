//go:build windows

package stream

import "fmt"

func startLocalShell(
	shell, cwd string,
	env []string,
	cols, rows uint16,
) (*localShellProcess, error) {
	return nil, fmt.Errorf("local terminal is not supported on Windows yet")
}

func (p *localShellProcess) Resize(cols, rows uint16) error {
	return nil
}

func localShellCandidates() []string {
	return []string{"powershell.exe", "pwsh.exe", "cmd.exe"}
}
