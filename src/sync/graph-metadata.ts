// @ts-nocheck
import type { RepositoryProvider } from '../types/provider'
import { join } from 'pathe'
import { writeFileEnsured } from '../utils/fs'

export async function writeRepositoryGraphMetadata(
  storageDirAbsolute: string,
  provider: RepositoryProvider,
  owner: string,
  _repo: string,
): Promise<void> {
  const metadataDir = join(storageDirAbsolute, '.metadata')

  try {
    const issueTypes = await provider.fetchRepositoryIssueTypes()
    if (issueTypes.length > 0) {
      const issueTypesPath = join(metadataDir, 'issue-types.json')
      await writeFileEnsured(issueTypesPath, JSON.stringify(issueTypes, null, 2))
    }
  }
  catch {
  }

  try {
    const issueFields = await provider.fetchOrganizationIssueFields(owner)
    if (issueFields.length > 0) {
      const issueFieldsPath = join(metadataDir, 'issue-fields.json')
      await writeFileEnsured(issueFieldsPath, JSON.stringify(issueFields, null, 2))
    }
  }
  catch {
  }
}
