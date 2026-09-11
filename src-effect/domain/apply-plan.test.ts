/**
 * Schema round-trips for ApplyPlan domain.
 * Copy to: src-effect/domain/apply-plan.test.ts
 *
 * REQUIRES: `@effect/vitest` as a real package.json dep + lockfile
 * (Orchestrator landing on #194 — do not use bare `vitest`).
 */
import { DateTime, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  ApplyOpResult,
  ApplyOptions,
  ApplyPlan,
  ApplyPlanSummary,
  ApplyResult,
  CreateLabelOp,
} from "./apply-plan"

describe("ApplyPlan schemas", () => {
  it("CreateLabelOp + empty ApplyPlan decode", () => {
    const op = new CreateLabelOp({
      id: "bug",
      uri: "ghfs:label:bug",
      action: "create",
      kind: "label",
      alchemyType: "GitHub.Label",
      props: { name: "bug", color: "d73a4a" }
    })
    expect(op.kind).toBe("label")
    expect(op.action).toBe("create")

    const summary = new ApplyPlanSummary({
      creates: 1,
      updates: 0,
      deletes: 0,
      total: 1
    })
    const plan = new ApplyPlan({
      id: "plan-test",
      dryRun: true,
      createdAt: DateTime.nowUnsafe(),
      repo: "agustif/ghfs",
      directory: ".ghfs",
      ops: [op],
      summary
    })
    expect(plan.ops).toHaveLength(1)
    expect(plan.summary.total).toBe(1)

    const encoded = Schema.encodeSync(ApplyPlan)(plan)
    const decoded = Schema.decodeUnknownSync(ApplyPlan)(encoded)
    expect(decoded.id).toBe("plan-test")
    expect(decoded.ops[0]?.kind).toBe("label")
  })

  it("ApplyResult + ApplyOptions Schema.Class", () => {
    const opts = new ApplyOptions({ dryRun: true })
    expect(opts.dryRun).toBe(true)

    const result = new ApplyResult({
      planId: "plan-test",
      dryRun: true,
      applied: 0,
      failed: 0,
      skipped: 1,
      results: [
        new ApplyOpResult({
          uri: "ghfs:label:bug",
          action: "create",
          kind: "label",
          status: "dry-run",
          message: "Would create label via alchemy deploy"
        })
      ]
    })
    expect(result.skipped).toBe(1)
    expect(result.results[0]?.status).toBe("dry-run")
  })
})
