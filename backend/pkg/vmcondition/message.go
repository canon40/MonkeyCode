package vmcondition

import (
	"strings"

	"github.com/chaitin/MonkeyCode/backend/pkg/taskflow"
)

const (
	MessageNetworkExchangeFull  = "宿主机网络资源已满（路由表/邻居表条目达到上限），暂时无法创建新的开发环境。请稍后重试，或联系管理员清理宿主机网络配置。"
	MessageNetworkDeviceMissing = "开发环境网络设备初始化失败，暂时无法启动。请稍后重试，或联系管理员检查宿主机网络状态。"
	MessageStartupFailed        = "开发环境启动失败，请稍后重试。若问题持续，请联系管理员并提供错误详情。"
)

func ResolveMessage(rawMessage string) string {
	if rawMessage == "" {
		return rawMessage
	}

	normalized := strings.ToLower(rawMessage)
	switch {
	case strings.Contains(normalized, "rtnetlink") && strings.Contains(normalized, "exchange full"):
		return MessageNetworkExchangeFull
	case strings.Contains(normalized, "cannot find device"):
		return MessageNetworkDeviceMissing
	case strings.Contains(normalized, "startup failed"), strings.Contains(normalized, "start instance failed"):
		return MessageStartupFailed
	default:
		return rawMessage
	}
}

func MapConditions(conditions []*taskflow.Condition) []*taskflow.Condition {
	if len(conditions) == 0 {
		return conditions
	}

	mapped := make([]*taskflow.Condition, len(conditions))
	for i, cond := range conditions {
		if cond == nil {
			continue
		}
		copy := *cond
		copy.Message = ResolveMessage(cond.Message)
		mapped[i] = &copy
	}
	return mapped
}
