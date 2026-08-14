const VM_CONDITION_MESSAGE_KEYS = {
  networkExchangeFull: "commonUtils.vmCondition.networkExchangeFull",
  networkDeviceMissing: "commonUtils.vmCondition.networkDeviceMissing",
  startupFailed: "commonUtils.vmCondition.startupFailed",
} as const

export type VmConditionMessageKey = keyof typeof VM_CONDITION_MESSAGE_KEYS

export function resolveVmConditionMessageKey(
  rawMessage: string | undefined,
): VmConditionMessageKey | null {
  if (!rawMessage) {
    return null
  }

  const normalized = rawMessage.toLowerCase()
  if (normalized.includes("rtnetlink") && normalized.includes("exchange full")) {
    return "networkExchangeFull"
  }
  if (normalized.includes("cannot find device")) {
    return "networkDeviceMissing"
  }
  if (normalized.includes("startup failed") || normalized.includes("start instance failed")) {
    return "startupFailed"
  }

  return null
}

export function mapVmConditionMessage(
  rawMessage: string | undefined,
  translate: (key: string) => string,
): string {
  if (!rawMessage) {
    return ""
  }

  const messageKey = resolveVmConditionMessageKey(rawMessage)
  if (!messageKey) {
    return rawMessage
  }

  return translate(VM_CONDITION_MESSAGE_KEYS[messageKey])
}

export function getVmMessageFromConditions(
  conditions: Array<{ message?: string }> | undefined,
  translate: (key: string) => string,
): string {
  if (!conditions?.length) {
    return ""
  }

  return mapVmConditionMessage(conditions[conditions.length - 1]?.message, translate)
}
