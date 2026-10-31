package stream

import (
	"os"
	"os/exec"
)

// localShellProcess wraps a shell running behind a platform PTY.
type localShellProcess struct {
	file *os.File
	cmd  *exec.Cmd
}

func (p *localShellProcess) Read(buf []byte) (int, error) {
	return p.file.Read(buf)
}

func (p *localShellProcess) Write(buf []byte) (int, error) {
	return p.file.Write(buf)
}

func (p *localShellProcess) Close() error {
	if p.cmd != nil && p.cmd.Process != nil {
		_ = p.cmd.Process.Kill()
	}
	if p.file != nil {
		return p.file.Close()
	}
	return nil
}
