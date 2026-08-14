---
name: org-delegate-work
description: 총괄 매니저가 작업을 직원(서브에이전트)에게 위임하고 OpenWork로 자동 학습까지 마무리할 때 사용. 트리거: 위임, 매니저, 직원, 조직, 팀, 자동 학습, OpenWork 스킬.
---

# 조직 위임 + 자동 학습

## 사전 조건

- 조직 정의: `openwork/org-structure.yaml`
- Cursor 규칙: `.cursor/rules/openwork-org-manager.mdc`, `openwork-auto-learn.mdc`
- OpenWork MCP: `.cursor/mcp.json` → Cursor에서 OAuth Connect

## 워크플로

### 1. 매니저 — 요청 분해

```text
목표: [한 문장]
완료 기준: [체크리스트]
직원 배정:
  - [research|developer|reviewer|tester|operator] → [하위 목표]
```

병렬 가능하면 Task 도구를 **동시에** 여러 번 호출한다.

### 2. 직원 — Task 프롬프트 템플릿

```text
You are the [직원 title] for this org. Read openwork/org-structure.yaml.

Task: [구체적 목표]
Constraints: branch cursor/...-2e9d, minimal diff, run tests: [commands]
Return: files changed, test output summary, blockers
```

### 3. 매니저 — 통합

- 직원 결과 충돌 시 developer 우선, reviewer가 최종 diff 확인
- 사용자에게 한국어로 **누가/무엇/다음 자동화** 보고

### 4. 자동 학습

OpenWork MCP 연결 시:

1. `search_capabilities` — query: "create skill" 또는 "memory"
2. `execute_capability` — 팀 runbook 저장

미연결 시 사용자에게 스킬 생성 문장 제안:

```text
Turn what we just did into a reusable skill for the team
```

## OpenWork Cloud 수동 동기화 (최초 1회)

1. [app.openworklabs.com](https://app.openworklabs.com) → **Members** → Admin 1명, Member N명
2. **Teams**: `Management`, `Engineering`, `Operations` (`org-structure.yaml` 참고)
3. **Extensions → Plugins** → 팀 스킬 생성 → Marketplace → 팀 접근 권한
4. Cursor → MCP → openwork Connect → 조직 선택

## 완료 체크리스트

- [ ] 모든 하위 작업에 직원 배정됨
- [ ] 테스트/리뷰 통과
- [ ] 반복 가능하면 스킬·메모리 학습 시도 또는 안내
- [ ] 사용자 보고 (한국어)
