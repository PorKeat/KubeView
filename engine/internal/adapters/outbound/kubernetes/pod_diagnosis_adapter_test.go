package kubernetes

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

func TestProbeHandlerReadsAsASentence(t *testing.T) {
	tests := []struct {
		name  string
		probe *corev1.Probe
		want  string
	}{
		{
			name: "http path and numeric port",
			probe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{
					Path: "/healthz",
					Port: intstr.FromInt32(8080),
				},
			}},
			want: "HTTP /healthz on port 8080",
		},
		{
			name: "https defaults an empty path",
			probe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{
					Scheme: corev1.URISchemeHTTPS,
					Port:   intstr.FromString("https"),
				},
			}},
			want: "HTTPS / on port https",
		},
		{
			name: "tcp socket",
			probe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{
				TCPSocket: &corev1.TCPSocketAction{Port: intstr.FromInt32(5432)},
			}},
			want: "TCP on port 5432",
		},
		{
			name: "exec command",
			probe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{
				Exec: &corev1.ExecAction{
					Command: []string{"cat", "/tmp/healthy"},
				},
			}},
			want: "exec cat /tmp/healthy",
		},
		{
			name: "grpc port",
			probe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{
				GRPC: &corev1.GRPCAction{Port: 9000},
			}},
			want: "gRPC on port 9000",
		},
		{
			name:  "unknown handler",
			probe: &corev1.Probe{},
			want:  "unknown handler",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := probeHandler(test.probe); got != test.want {
				t.Fatalf("probeHandler() = %q, want %q", got, test.want)
			}
		})
	}
}
