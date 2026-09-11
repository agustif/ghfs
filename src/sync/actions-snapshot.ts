// @ts-nocheck
import type { SyncContext } from './sync-repository-types'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import {
  ACTIONS_DIR_NAME,
  ACTIONS_WORKFLOWS_FILE_NAME,
  AUTOLINKS_FILE_NAME,
  PAGES_DIR_NAME,
  PAGES_FILE_NAME,
  RULE_SUITES_DIR_NAME,
  RULE_SUITES_FILE_NAME,
} from '../constants'

/**
 * Write Actions catalog snapshots:
 * - .ghfs/actions/workflows.json
 * - .ghfs/rule-suites/rule-suites.json
 * - .ghfs/pages/latest-build.json
 * - .ghfs/autolinks.json
 *
 * @see https://docs.github.com/en/rest/actions/workflows
 * @see https://docs.github.com/en/rest/repos/rule-suites
 * @see https://docs.github.com/en/rest/pages
 * @see https://docs.github.com/en/rest/repos/autolinks
 */
export async function writeActionsSnapshots(context: SyncContext): Promise<void> {
  if (!context.config.sync?.actions)
    return

  await Promise.all([
    writeWorkflowsFile(context),
    writeRuleSuitesFile(context),
    writePagesFile(context),
    writeAutolinksFile(context),
  ])
}

async function writeWorkflowsFile(context: SyncContext): Promise<void> {
  if (!context.provider.fetchWorkflows)
    return

  try {
    const workflows = await context.provider.fetchWorkflows()
    const actionsDir = join(context.storageDirAbsolute, ACTIONS_DIR_NAME)
    await mkdir(actionsDir, { recursive: true })

    const workflowsWithPermissions = await Promise.all(
      workflows.map(async (workflow) => {
        let permissions = null
        if (context.provider.fetchWorkflowPermissions) {
          try {
            permissions = await context.provider.fetchWorkflowPermissions(workflow.id)
          }
          catch {
            // Ignore errors fetching individual workflow permissions
          }
        }
        return {
          ...workflow,
          permissions: permissions ?? undefined,
        }
      }),
    )

    const data = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      count: workflowsWithPermissions.length,
      workflows: workflowsWithPermissions,
    }

    await writeFile(
      join(actionsDir, ACTIONS_WORKFLOWS_FILE_NAME),
      JSON.stringify(data, null, 2),
      'utf8',
    )
  }
  catch {
    // Silently skip on error
  }
}

async function writeRuleSuitesFile(context: SyncContext): Promise<void> {
  if (!context.provider.fetchRuleSuites)
    return

  try {
    const ruleSuites = await context.provider.fetchRuleSuites({ limit: 30 })
    const ruleSuitesDir = join(context.storageDirAbsolute, RULE_SUITES_DIR_NAME)
    await mkdir(ruleSuitesDir, { recursive: true })

    const data = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      count: ruleSuites.length,
      rule_suites: ruleSuites,
    }

    await writeFile(
      join(ruleSuitesDir, RULE_SUITES_FILE_NAME),
      JSON.stringify(data, null, 2),
      'utf8',
    )
  }
  catch {
    // Silently skip on error
  }
}

async function writePagesFile(context: SyncContext): Promise<void> {
  if (!context.provider.fetchLatestPagesBuild)
    return

  try {
    const latestBuild = await context.provider.fetchLatestPagesBuild()
    if (!latestBuild)
      return

    const pagesDir = join(context.storageDirAbsolute, PAGES_DIR_NAME)
    await mkdir(pagesDir, { recursive: true })

    const data = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      latest_build: latestBuild,
    }

    await writeFile(
      join(pagesDir, PAGES_FILE_NAME),
      JSON.stringify(data, null, 2),
      'utf8',
    )
  }
  catch {
    // Silently skip on error
  }
}

async function writeAutolinksFile(context: SyncContext): Promise<void> {
  if (!context.provider.fetchAutolinks)
    return

  try {
    const autolinks = await context.provider.fetchAutolinks()
    const data = {
      repo: context.repoSlug,
      synced_at: context.syncedAt,
      count: autolinks.length,
      autolinks,
    }

    await writeFile(
      join(context.storageDirAbsolute, AUTOLINKS_FILE_NAME),
      JSON.stringify(data, null, 2),
      'utf8',
    )
  }
  catch {
    // Silently skip on error
  }
}
