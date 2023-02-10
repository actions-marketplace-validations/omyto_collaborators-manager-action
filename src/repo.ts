export class Invitation {
  id: number
  username: string

  constructor(id: number, username: string) {
    this.id = id
    this.username = username
  }
}

export class Repo {
  owner: string
  repo: string
  exist: boolean
  collaborators?: string[]
  invitations?: Invitation[]

  private _full_name?: string

  constructor(owner: string, repo: string, exist: boolean = false) {
    this.owner = owner
    this.repo = repo
    this.exist = exist
  }

  public get fullName(): string {
    if (!this._full_name) {
      this._full_name = `${this.owner}/${this.repo}`
    }
    return this._full_name
  }

  hasCollaborator(username: string): boolean {
    if (this.collaborators) {
      return this.collaborators.includes(username)
    }
    return false
  }

  hasInvitationUser(username: string): boolean {
    return typeof this.getInvitationId(username) == 'number'
  }

  getInvitationId(username: string): number | null {
    if (this.invitations) {
      for (const invitation of this.invitations) {
        if (invitation.username == username) {
          return invitation.id
        }
      }
    }
    return null
  }
}
