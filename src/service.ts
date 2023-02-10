import {
  Collaborator,
  GithubIssueContext,
  Octokit,
  Repository,
  RepositoryInvitation
} from './types'
import {Invitation, Repo} from './repo'

const PER_PAGE = 50

export class Service {
  private octokit: Octokit
  constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  /** Repositories */
  async validateRepository(repo: Repo): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: repo.owner,
        repo: repo.repo
      })
    }
    catch (error) {
      return false
    }
    return true
  }

  async getAllReposForAuthenticatedUser(): Promise<Repo[]> {
    let repositories = await this.getRepositoriesForAuthenticatedUser()
    return repositories.map(
      repository =>
        new Repo(
          repository.owner.login,
          repository.full_name.split('/')[1],
          true
        )
    )
  }

  async addRepoCollaborator(user: string, repo: Repo): Promise<void> {
    await this.octokit.rest.repos.addCollaborator({
      owner: repo.owner,
      repo: repo.repo,
      username: user
    })
  }

  async removeRepoCollaborator(user: string, repo: Repo): Promise<void> {
    await this.octokit.rest.repos.removeCollaborator({
      owner: repo.owner,
      repo: repo.repo,
      username: user
    })
  }

  async deleteRepoInvitation(invitationId: number, repo: Repo): Promise<void> {
    await this.octokit.rest.repos.deleteInvitation({
      owner: repo.owner,
      repo: repo.repo,
      invitation_id: invitationId
    })
  }

  async updateRepoInfo(
    repos: Repo[],
    getCollaborators: boolean,
    getInvitations: boolean
  ): Promise<void> {
    for (const repo of repos) {
      if (getCollaborators) {
        try {
          repo.collaborators = await this.getRepositoryCollaborators(
            repo.repo,
            repo.owner
          )
          repo.exist = true
        }
        catch (error) {
          // repo.exist = false
          continue
        }
      }

      if (getInvitations) {
        try {
          repo.invitations = await this.getRepositoryInvitations(
            repo.repo,
            repo.owner
          )
          repo.exist = true
        }
        catch (error) {
          // repo.exist = false
          continue
        }
      }

      if (!repo.exist) {
        repo.exist = await this.validateRepository(repo)
      }
    }
  }

  /** Users */
  async validateUsers(users: string[]): Promise<void> {
    let invalids: string[] = []
    for (const user of users) {
      if (!(await this.validateUser(user))) {
        invalids.push(user)
      }
    }

    if (invalids.length > 1) {
      throw new Error(`Users \`${invalids.join(', ')}\` does not exist!`)
    }
    else if (invalids.length == 1) {
      throw new Error(`User \`${invalids[0]}\` does not exist!`)
    }
  }

  async validateUser(user: string): Promise<boolean> {
    try {
      await this.octokit.rest.users.getByUsername({
        username: user
      })
    }
    catch (error) {
      return false
    }
    return true
  }

  /** Comments */
  async createComment(issue: GithubIssueContext, body: string): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      body: body
    })
  }

  private async getRepositoriesForAuthenticatedUser(): Promise<Repository[]> {
    let pageIndex = 0
    let finished = false

    let ids = new Set<number>()
    let repositories = new Array<Repository>()

    while (!finished) {
      let response = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: 'all',
        affiliation: 'owner',
        per_page: PER_PAGE,
        page: pageIndex
      })

      let results = response.data
      results.forEach(repository => {
        if (!ids.has(repository.id)) {
          ids.add(repository.id)
          repositories.push(repository)
        }
      })

      pageIndex++
      if (results.length < PER_PAGE) {
        finished = true
      }
    }

    return repositories
  }

  private async getRepositoryCollaborators(
    repo: string,
    owner: string
  ): Promise<string[]> {
    let pageIndex = 0
    let finished = false

    let ids = new Set<number>()
    let collaborators = new Array<Collaborator>()

    while (!finished) {
      let response = await this.octokit.rest.repos.listCollaborators({
        owner: owner,
        repo: repo,
        per_page: PER_PAGE,
        page: pageIndex
      })

      let results = response.data
      results.forEach(user => {
        if (!ids.has(user.id)) {
          ids.add(user.id)
          collaborators.push(user)
        }
      })

      pageIndex++
      if (results.length < PER_PAGE) {
        finished = true
      }
    }

    return collaborators.map(collaborator => collaborator.login)
  }

  private async getRepositoryInvitations(
    repo: string,
    owner: string
  ): Promise<Invitation[]> {
    let pageIndex = 0
    let finished = false

    let ids = new Set<number>()
    let invitations = new Array<RepositoryInvitation>()

    while (!finished) {
      let response = await this.octokit.rest.repos.listInvitations({
        owner: owner,
        repo: repo,
        per_page: PER_PAGE,
        page: pageIndex
      })

      let results = response.data
      results.forEach(invitation => {
        if (!ids.has(invitation.id)) {
          ids.add(invitation.id)
          invitations.push(invitation)
        }
      })

      pageIndex++
      if (results.length < PER_PAGE) {
        finished = true
      }
    }

    return invitations.map(
      invitation => new Invitation(invitation.id, invitation.invitee!.login)
    )
  }
}
