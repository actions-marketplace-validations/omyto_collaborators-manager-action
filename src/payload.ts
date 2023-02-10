import {Repo} from './repo'
import {GithubContext, GithubIssueContext} from './types'

const ActionHeaderKey = '## collaborators-manager-action'
const AddCollaboratorKey = '### add collaborators'
const RemoveCollaboratorKey = '### remove collaborators'
const ListRepositoriesKey = '### list repositories'
const ListCollaboratorsKey = '### list collaborators'
const CollaboratorsKey = '- users:'
const RepositoriesKey = '- repos:'
const SeparatorKey = ','

export enum ActionId {
  None,
  AddCollaborator,
  RemoveCollaborator,
  ListRepositories,
  ListCollaborators
}

export class Payload {
  readonly context: GithubContext
  readonly collaborators: string[] = []
  readonly repositories: string[] = []

  private _actionId = ActionId.None
  private _repos: Repo[] = []

  get actionId(): ActionId {
    return this._actionId
  }

  get issue(): GithubIssueContext {
    return this.context.issue
  }

  get owner(): string {
    return this.context.issue.owner
  }

  get repos(): Repo[] {
    if (this._repos.length == 0) {
      for (const repository of this.repositories) {
        let repos = repository.split('/')
        if (repos.length == 2) {
          this._repos.push(new Repo(repos[0], repos[1]))
        }
        else {
          this._repos.push(new Repo(this.owner, repository))
        }
      }
    }
    return this._repos
  }

  constructor(context: GithubContext, body: string) {
    this.context = context
    const lines = body.split('\r\n')
    for (let index = 0; index < lines.length; index++) {
      let line = lines[index]
      if (line.startsWith(ActionHeaderKey)) {
        ++index == lines.length && this.throwError()
        line = lines[index]

        if (line.startsWith(AddCollaboratorKey)) {
          this._actionId = ActionId.AddCollaborator
        }
        else if (line.startsWith(RemoveCollaboratorKey)) {
          this._actionId = ActionId.RemoveCollaborator
        }
        else if (line.startsWith(ListRepositoriesKey)) {
          this._actionId = ActionId.ListRepositories
        }
        else if (line.startsWith(ListCollaboratorsKey)) {
          this._actionId = ActionId.ListCollaborators
        }
        else {
          this.throwError()
        }

        ++index == lines.length && this.throwError()
        line = lines[index]

        switch (this._actionId) {
          case ActionId.AddCollaborator:
          case ActionId.RemoveCollaborator:
            if (line.startsWith(CollaboratorsKey)) {
              this.collaborators = flatSplitString(
                line.replace(CollaboratorsKey, ''),
                SeparatorKey
              )

              ++index == lines.length && this.throwError()
              line = lines[index]
              if (line.startsWith(RepositoriesKey)) {
                this.repositories = flatSplitString(
                  line.replace(RepositoriesKey, ''),
                  SeparatorKey
                )
                return
              }
            }
            break
          case ActionId.ListRepositories:
            if (line.startsWith(CollaboratorsKey)) {
              this.collaborators = flatSplitString(
                line.replace(CollaboratorsKey, ''),
                SeparatorKey
              )
              return
            }
            break
          case ActionId.ListCollaborators:
            if (line.startsWith(RepositoriesKey)) {
              this.repositories = flatSplitString(
                line.replace(RepositoriesKey, ''),
                SeparatorKey
              )
              return
            }
            break
          default:
            break
        }

        this.throwError()
      }
    }
  }

  public validate(): boolean {
    switch (this._actionId) {
      case ActionId.None:
        break
      case ActionId.AddCollaborator:
      case ActionId.RemoveCollaborator:
        this.collaborators.length == 0 &&
          this.throwError('Empty collaborators parameter!')
        this.repositories.length == 0 &&
          this.throwError('Empty repositories parameter!')
        break
      case ActionId.ListRepositories:
        this.collaborators.length == 0 &&
          this.throwError('Empty collaborators parameter!')
        break
      case ActionId.ListCollaborators:
        this.repositories.length == 0 &&
          this.throwError('Empty repositories parameter!')
        break
      default:
        this.throwError('Unknown issue context!')
        break
    }
    return true
  }

  private throwError(message?: string) {
    throw new Error(message ?? 'Invalid collaborators manager issue format!')
  }
}

function flatSplitString(str: string, separator: string): string[] {
  let set = new Set<string>()
  let results: string[] = []
  const values = str.split(separator)
  values.forEach(value => {
    if (value) {
      let trim = value.trim()
      if (trim.length > 0 && !set.has(trim)) {
        set.add(trim)
        results.push(trim)
      }
    }
  })
  return results
}
