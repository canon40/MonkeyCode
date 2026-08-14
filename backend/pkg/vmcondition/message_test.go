package vmcondition

import (
	"testing"

	"github.com/chaitin/MonkeyCode/backend/pkg/taskflow"
)

func TestResolveMessage(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want string
	}{
		{
			name: "rtnetlink exchange full",
			raw:  "Startup failed: start instance failed: RTNETLINK answers: Exchange full",
			want: MessageNetworkExchangeFull,
		},
		{
			name: "missing network device",
			raw:  `Startup failed: Cannot find device "fc2260f82f40"`,
			want: MessageNetworkDeviceMissing,
		},
		{
			name: "generic startup failure",
			raw:  "Startup failed: container runtime exited unexpectedly",
			want: MessageStartupFailed,
		},
		{
			name: "preserve unknown message",
			raw:  "Image pull failed: connection timed out",
			want: "Image pull failed: connection timed out",
		},
		{
			name: "empty message",
			raw:  "",
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ResolveMessage(tt.raw); got != tt.want {
				t.Fatalf("ResolveMessage() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMapConditions(t *testing.T) {
	conditions := []*taskflow.Condition{
		{Message: "Pulling image"},
		{Message: "Startup failed: RTNETLINK answers: Exchange full"},
	}

	mapped := MapConditions(conditions)
	if len(mapped) != 2 {
		t.Fatalf("len(mapped) = %d, want 2", len(mapped))
	}
	if mapped[0].Message != "Pulling image" {
		t.Fatalf("mapped[0].Message = %q", mapped[0].Message)
	}
	if mapped[1].Message != MessageNetworkExchangeFull {
		t.Fatalf("mapped[1].Message = %q", mapped[1].Message)
	}
	if conditions[1].Message != "Startup failed: RTNETLINK answers: Exchange full" {
		t.Fatalf("original condition message was mutated")
	}
}
