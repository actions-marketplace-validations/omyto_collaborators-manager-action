export class User {
  username: string
  exist: boolean

  constructor(username: string) {
    this.username = username
    this.exist = false
  }
}
