import * as core from '@actions/core'
import {ActionId, Payload} from './payload'
import {Service} from './service'

const NEW_LINE = '\r\n'
const FOOTER = '\r\n--\r\n_collaborators-manager-action_'

export class Action {
  private payload: Payload
  private service: Service

  constructor(payload: Payload, service: Service) {
    this.payload = payload
    this.service = service

    this.payload.validate()
  }

  static get footer(): string {
    return FOOTER
  }

  public async run(): Promise<void> {
    let messages: string[] = []
    switch (this.payload.actionId) {
      case ActionId.None:
        core.setFailed('This is not a issue for collaborators manager action!')
        return
      case ActionId.AddCollaborator:
        if (this.payload.repositories.includes('*')) {
          throw new Error('Add a collaborator to all repositories is unsupported!')
        }
        messages = await this.addCollaborator()
        break
      case ActionId.RemoveCollaborator:
        messages = await this.removeCollaborator()
        break
      case ActionId.ListRepositories:
        messages = await this.listRepositories()
        break
      case ActionId.ListCollaborators:
        messages = await this.listCollaborators()
        break
    }

    await this.service.createComment(
      this.payload.issue,
      `${messages.join(NEW_LINE)}\r\n${FOOTER}`
    )
  }

  private async addCollaborator(): Promise<string[]> {
    const users = this.payload.collaborators
    const repos = this.payload.repos
    await this.service.validateUsers(users)
    await this.service.updateRepoInfo(repos, true, false)
    const invalidRepos = repos
      .filter(repo => !repo.exist)
      .map(repo => repo.repo)
    if (invalidRepos.length > 0) {
      throw new Error(`Repository \`${invalidRepos.join(', ')}\` does not exist!`)
    }

    const messages: string[] = ['Invitation collaborators status\r\n']

    messages.push('| No | Repository | Status |')
    messages.push('|:--:|------------|--------|')

    for (let index = 0; index < repos.length; index++) {
      const repo = repos[index]
      const inviteUserMessages: string[] = []

      for (const user of users) {
        if (repo.hasCollaborator(user)) {
          inviteUserMessages.push(`User \`${user}\` already a collaborator`)
          continue
        }

        try {
          await this.service.addRepoCollaborator(user, repo)
          inviteUserMessages.push(`[Invite sent](https://github.com/${repo.fullName}/invitations), awaiting [${user}'s](https://github.com/${user}) response`)
        }
        catch (error: any) {
          inviteUserMessages.push(`Invite user [${user}](https://github.com/${user}) failed. Error: ${error.message}`)
          console.log(`Invite user ${user} to repository ${repo.fullName} error: ${error}`)
        }
      }

      messages.push(`|${index + 1}|[${repo.repo}](https://github.com/${repo.fullName})|${inviteUserMessages.join('<br>')}|`)
    }

    return messages
  }

  private async removeCollaborator(): Promise<string[]> {
    const users = this.payload.collaborators
    await this.service.validateUsers(users)

    const forAllRepo = this.payload.repositories.includes('*')
    const repos = forAllRepo
      ? await this.service.getAllReposForAuthenticatedUser()
      : this.payload.repos
    await this.service.updateRepoInfo(repos, true, true)
    const invalidRepos = repos
      .filter(repo => !repo.exist)
      .map(repo => repo.repo)
    if (invalidRepos.length > 0) {
      throw new Error(`Repository \`${invalidRepos.join(', ')}\` does not exist!`)
    }

    const messages: string[] = ['Remove collaborators status\r\n']

    messages.push('| No | Repository | Status |')
    messages.push('|:--:|------------|--------|')

    for (let index = 0; index < repos.length; index++) {
      const repo = repos[index]
      const removedUserMessages: string[] = []

      for (const user of users) {
        if (repo.hasCollaborator(user)) {
          try {
            await this.service.removeRepoCollaborator(user, repo)
            removedUserMessages.push(`Removed user [${user}](https://github.com/${user})`)
          }
          catch (error: any) {
            removedUserMessages.push(`Remove user [${user}](https://github.com/${user}) failed. Error: ${error.message}`)
          }
        }
        else {
          const invitationId = repo.getInvitationId(user)
          if (invitationId != null) {
            try {
              await this.service.deleteRepoInvitation(invitationId, repo)
              removedUserMessages.push(`Deleted [${user}'s](https://github.com/${user}) invitation`)
            }
            catch (error: any) {
              removedUserMessages.push(`Delete [${user}'s](https://github.com/${user}) invitation failed. Error: ${error.message}`)
            }
          }
        }
      }

      if (removedUserMessages.length > 0) {
        messages.push(`|${messages.length - 2}|[${repo.repo}](https://github.com/${repo.fullName})|${removedUserMessages.join('<br>')}|`)
      }
    }

    return messages.length > 3
      ? messages
      : [`User \`${users.join(', ')}\` is not a collaborator!`]
  }

  private async listRepositories(): Promise<string[]> {
    const users = this.payload.collaborators
    const forAllUser = users.includes('*')

    if (!forAllUser) {
      await this.service.validateUsers(users)
    }

    const repos = await this.service.getAllReposForAuthenticatedUser()
    if (repos.length == 0) {
      throw new Error(`User \`${this.payload.owner}\` don't have any repository!`)
    }

    await this.service.updateRepoInfo(repos, true, true)

    const data = new Map<string, string[]>()
    for (const repo of repos) {
      const collaborators = repo.collaborators ?? []
      collaborators.forEach(user => {
        if (!data.has(user)) {
          data.set(user, [])
        }
        data
          .get(user)!
          .push(`[${repo.repo}](https://github.com/${repo.fullName})`)
      })

      const invitations = repo.invitations ?? []
      invitations.forEach(invitation => {
        const user = invitation.username
        if (!data.has(user)) {
          data.set(user, [])
        }
        data
          .get(user)!
          .push(`[${repo.repo}](https://github.com/${repo.fullName}) _(invitation)_`)
      })
    }

    const messages: string[] = [
      'Here is list of repositories for each collaborator\r\n'
    ]

    messages.push('| No | Username | Repositories |')
    messages.push('|:--:|----------|--------------|')

    if (forAllUser) {
      let index = 0
      data.forEach((values, user) => {
        if (user == this.payload.owner) {
          /** Ignore owner*/
          return
        }

        messages.push(`|${index + 1}|[${user}](https://github.com/${user})|${values.join(', ')}|`)
        index++
      })
    }
    else {
      users.forEach((user, index) => {
        const values = data.get(user) ?? []
        messages.push(`|${index + 1}|[${user}](https://github.com/${user})|${values.join(', ')}|`)
      })
    }

    return messages
  }

  private async listCollaborators(): Promise<string[]> {
    const forAllRepo = this.payload.repositories.includes('*')
    const repos = forAllRepo
      ? await this.service.getAllReposForAuthenticatedUser()
      : this.payload.repos

    await this.service.updateRepoInfo(repos, true, true)

    const invalidRepos = repos
      .filter(repo => !repo.exist)
      .map(repo => repo.fullName)
    if (invalidRepos.length > 0) {
      throw new Error(`Repository \`${invalidRepos.join(', ')}\` does not exist!`)
    }

    const messages: string[] = [
      'Here is list of collaborators for each repository\r\n'
    ]

    messages.push('| No | Repository | Collaborators | Invitations |')
    messages.push('|:--:|------------|---------------|-------------|')

    for (let index = 0; index < repos.length; index++) {
      const repo = repos[index]
      const collaborators = repo.collaborators ?? []
      const invitations = repo.invitations ?? []
      const size = collaborators.length + invitations.length - 1

      /** Get collaborators */
      let listCollaborators: string[] = []
      if (collaborators.length > 1) {
        collaborators.forEach(user => {
          if (user != this.payload.owner) {
            listCollaborators.push(`[${user}](https://github.com/${user})`)
          }
        })
      }

      /** Get invitations */
      let listInvitations: string[] = []
      if (invitations.length > 0) {
        invitations.forEach(invitation => {
          listInvitations.push(
            `[${invitation.username}](https://github.com/${invitation.username})`
          )
        })
      }

      messages.push(`|${index + 1}|[${repo.repo}](https://github.com/${repo.fullName})|${listCollaborators.join(', ')}|${listInvitations.join(', ')}|`)
    }

    return messages
  }
}
