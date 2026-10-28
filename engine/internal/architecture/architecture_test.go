package architecture

import (
	"bytes"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

const engineRoot = "../.."

func TestDomainAndApplicationImportBoundaries(t *testing.T) {
	tests := []struct {
		name      string
		dir       string
		forbidden []string
	}{
		{
			name: "domain",
			dir:  "internal/domain",
			forbidden: []string{
				"k8s.io/", "sigs.k8s.io/",
				"github.com/kubeview/engine/internal/application",
				"github.com/kubeview/engine/internal/adapters",
				"github.com/kubeview/engine/internal/cluster",
				"github.com/kubeview/engine/internal/bootstrap",
				"github.com/kubeview/engine/internal/ipc",
				"github.com/kubeview/engine/internal/stream",
			},
		},
		{
			name: "application",
			dir:  "internal/application",
			forbidden: []string{
				"k8s.io/", "sigs.k8s.io/",
				"github.com/kubeview/engine/internal/adapters",
				"github.com/kubeview/engine/internal/cluster",
				"github.com/kubeview/engine/internal/bootstrap",
				"github.com/kubeview/engine/internal/ipc",
				"github.com/kubeview/engine/internal/stream",
			},
		},
		{
			name: "inbound RPC",
			dir:  "internal/adapters/inbound",
			forbidden: []string{
				"k8s.io/", "sigs.k8s.io/",
				"github.com/kubeview/engine/internal/adapters/outbound",
				"github.com/kubeview/engine/internal/cluster",
				"github.com/kubeview/engine/internal/bootstrap",
			},
		},
	}

	for _, testCase := range tests {
		t.Run(testCase.name, func(t *testing.T) {
			root := filepath.Join(engineRoot, testCase.dir)
			err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
				if err != nil {
					return err
				}
				if entry.IsDir() || !strings.HasSuffix(path, ".go") {
					return nil
				}
				parsed, parseErr := parser.ParseFile(token.NewFileSet(), path, nil, parser.ImportsOnly)
				if parseErr != nil {
					return parseErr
				}
				for _, spec := range parsed.Imports {
					importPath, unquoteErr := strconv.Unquote(spec.Path.Value)
					if unquoteErr != nil {
						continue
					}
					for _, forbidden := range testCase.forbidden {
						if strings.HasPrefix(importPath, forbidden) {
							t.Errorf("%s imports forbidden dependency %q", path, importPath)
						}
					}
				}
				return nil
			})
			if err != nil {
				t.Fatalf("walk %s: %v", root, err)
			}
		})
	}
}

func TestGoSourceFilesStayUnder500Lines(t *testing.T) {
	err := filepath.WalkDir(engineRoot, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if entry.Name() == "bin" || entry.Name() == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		data, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		lineCount := bytes.Count(data, []byte("\n"))
		if len(data) > 0 && data[len(data)-1] != '\n' {
			lineCount++
		}
		if lineCount > 500 {
			t.Errorf("%s has %d lines (limit 500)", path, lineCount)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walk engine sources: %v", err)
	}
}
