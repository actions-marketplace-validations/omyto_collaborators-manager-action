# Manager Collaborators

Manager personal repositories collaborators via github issue

## Usage

### I. Create Workflow

Create a workflow with content:

```yaml
name: 'Collaborators Manager'
on:
  issues:
    types: opened

jobs:
  collaborators-manager:
    runs-on: ubuntu-latest
    steps:
      - uses: omyto/collaborators-manager-action@v1
        with:
          token: 'github token with `repo` access'
```

- Recommended: create a workflow in a private repository to ensure `token` are not exposed.

#### Inputs

| Name    | Description                       | Required |
|:-------:|:---------------------------------:|:--------:|
| `token` | A GitHub token with `repo` access | `yes`    |

### II. Create Issue

### 1. Add collaborators to repositories

Create new issue with content:

```
## collaborators-manager-action
### add collaborators
- users: <username>
- repos: <repository>
```

#### Parameters
- users: List of Github usernames. Separate by `,`.
- repos: List of personal repositories. Separate by `,`.

### 2. Remove collaborators from repositories

Create new issue with content:

```
## collaborators-manager-action
### remove collaborators
- users: <username>
- repos: *
```

#### Parameters
- users: List of Github usernames. Separate by `,`.
- repos: List of personal repositories. Separate by `,`.
  + Use `*` to remove from all personal repositories of `token` owner.

### 3. List collaborators for each repositories

Create new issue with content:

```
## collaborators-manager-action
### list collaborators
- repos: <repository>
```

#### Parameters
- repos: List of personal repositories. Separate by `,`.
  + Use `*` to list all personal repositories of `token` owner.

### 4. List repositories for each collaborators

Create new issue with content:

```
## collaborators-manager-action
### list repositories
- users: <username>
```

#### Parameters
- users: List of Github usernames. Separate by `,`.
  + Use `*` to list all collaborators from all repositories of `token` owner.

### Issue Templates

Use [templates](https://github.com/omyto/collaborators-manager-action/tree/main/ISSUE_TEMPLATE) to make issue creation easier
