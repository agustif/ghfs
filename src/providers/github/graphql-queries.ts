export const GITHUB_API_VERSION = '2022-11-28'

export const MERGE_QUEUE_QUERY = `
  query MergeQueue($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      mergeQueue {
        entries(first: 100) {
          nodes {
            id
            position
            state
            estimatedTimeToMerge
            enqueuedAt
            headCommit {
              oid
              message
            }
            pullRequest {
              number
              title
              url
            }
          }
        }
      }
    }
  }
`

export const PROJECTS_V2_QUERY = `
  query ProjectsV2($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      projectsV2(first: 100) {
        nodes {
          id
          number
          title
          shortDescription
          readme
          public
          closed
          url
          createdAt
          updatedAt
          closedAt
          owner {
            ... on Organization {
              login
            }
            ... on User {
              login
            }
          }
        }
      }
    }
  }
`

export const PROJECT_V2_FIELDS_QUERY = `
  query ProjectV2Fields($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        fields(first: 100) {
          nodes {
            ... on ProjectV2Field {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options {
                id
                name
                color
              }
            }
            ... on ProjectV2IterationField {
              id
              name
              dataType
            }
          }
        }
      }
    }
  }
`

export const PROJECT_V2_ITEMS_QUERY = `
  query ProjectV2Items($projectId: ID!, $cursor: String) {
    node(id: $projectId) {
      ... on ProjectV2 {
        items(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            fieldValues(first: 50) {
              nodes {
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldIterationValue {
                  title
                  field {
                    ... on ProjectV2FieldCommon {
                      id
                      name
                    }
                  }
                }
              }
            }
            content {
              ... on Issue {
                number
                title
                url
              }
              ... on PullRequest {
                number
                title
                url
              }
              ... on DraftIssue {
                title
              }
            }
          }
        }
      }
    }
  }
`

export const DISCUSSION_CATEGORIES_QUERY = `
  query DiscussionCategories($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      discussionCategories(first: 100) {
        nodes {
          id
          name
          emoji
          description
          isAnswerable
          createdAt
          slug
        }
      }
    }
  }
`

export const DISCUSSION_POLLS_QUERY = `
  query DiscussionPolls($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      discussions(first: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          poll {
            question
            totalVoteCount
            options {
              id
              option
              totalVoteCount
            }
          }
        }
      }
    }
  }
`

export const SPONSORSHIPS_QUERY = `
  query Sponsorships($owner: String!) {
    user(login: $owner) {
      sponsorshipsAsMaintainer(first: 100) {
        nodes {
          tier {
            id
            name
            monthlyPriceInDollars
            description
          }
          sponsorEntity {
            ... on User {
              login
              avatarUrl
              url
            }
            ... on Organization {
              login
              avatarUrl
              url
            }
          }
          createdAt
          isActive
          isOneTimePayment
        }
      }
    }
  }
`

export const SPONSORSHIPS_ORG_QUERY = `
  query SponsorshipsOrg($owner: String!) {
    organization(login: $owner) {
      sponsorshipsAsMaintainer(first: 100) {
        nodes {
          tier {
            id
            name
            monthlyPriceInDollars
            description
          }
          sponsorEntity {
            ... on User {
              login
              avatarUrl
              url
            }
            ... on Organization {
              login
              avatarUrl
              url
            }
          }
          createdAt
          isActive
          isOneTimePayment
        }
      }
    }
  }
`

export const ITEM_PROJECT_CONNECTIONS_QUERY = `
  query ItemProjectConnections($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      issueOrPullRequest(number: $number) {
        ... on Issue {
          projectItems(first: 100) {
            nodes {
              id
              project {
                id
                number
                title
              }
              fieldValues(first: 50) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
        ... on PullRequest {
          projectItems(first: 100) {
            nodes {
              id
              project {
                id
                number
                title
              }
              fieldValues(first: 50) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export const STATUS_CHECK_ROLLUP_QUERY = `
  query StatusCheckRollup($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        commits(last: 100) {
          nodes {
            commit {
              oid
              statusCheckRollup {
                state
                contexts(first: 100) {
                  nodes {
                    ... on CheckRun {
                      name
                      conclusion
                      status
                      detailsUrl
                      startedAt
                    }
                    ... on StatusContext {
                      context
                      state
                      description
                      targetUrl
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

export const REVIEW_THREADS_QUERY = `
  query ReviewThreads($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            isOutdated
            isCollapsed
            line
            originalLine
            startLine
            originalStartLine
            path
            diffSide
            comments(first: 100) {
              nodes {
                id
                body
                author {
                  login
                }
                createdAt
                replyTo {
                  id
                }
              }
            }
          }
        }
      }
    }
  }
`

export const ORG_TEAMS_QUERY = `
  query OrgTeams($owner: String!) {
    organization(login: $owner) {
      teams(first: 100) {
        nodes {
          id
          slug
          name
          description
          privacy
          url
          avatarUrl
          members {
            totalCount
          }
          repositories {
            totalCount
          }
          createdAt
          updatedAt
        }
      }
    }
  }
`
