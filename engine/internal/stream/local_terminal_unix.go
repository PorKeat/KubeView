//go:build !windows

package stream

import (
	"os"
	"os/exec"

	"github.com/creack/pty"
)

func startLocalShell(
	shell, cwd string,
	env []string,
	cols, rows uint16,
) (*localShellProcess, error) {
	cmd := exec.Command(shell)
	cmd.Dir = cwd
	cmd.Env = env

	file, err := pty.StartWithSize(cmd, &pty.Winsize{Cols: cols, Rows: rows})
	if err != nil {
		return nil, err
	}
	return &localShellProcess{file: file, cmd: cmd}, nil
}

func (p *localShellProcess) Resize(cols, rows uint16) error {
	return pty.Setsize(p.file, &pty.Winsize{Cols: cols, Rows: rows})
}

func localShellCandidates() []string {
	return []string{
		os.Getenv("SHELL"),
		"/bin/zsh",
		"/bin/bash",
		"/bin/sh",
	}
}
