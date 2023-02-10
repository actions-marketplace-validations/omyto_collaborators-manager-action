import * as github from '@actions/github'
import {components} from '@octokit/openapi-types'
import {GitHub} from '@actions/github/lib/utils'

export type Octokit = InstanceType<typeof GitHub>

export type GithubContext = typeof github.context

export type GithubIssueContext = typeof github.context.issue

export type Collaborator = components['schemas']['collaborator']

export type Repository = components['schemas']['repository']

export type RepositoryInvitation =
  components['schemas']['repository-invitation']
