import * as core from '@actions/core'
import * as github from '@actions/github'
import {Action} from './action'
import {Payload} from './payload'
import {Service} from './service'

async function run(): Promise<void> {
  const context = github.context
  const repo = context.repo
  const contextPayload = context.payload
  const issue_number = context.issue.number

  if (contextPayload.action !== 'opened' || context.eventName !== 'issues') {
    core.setFailed('`collaborators-manager-action` only support issue opened event')
    return
  }

  if (!issue_number) {
    core.setFailed('Issue number not found!')
    return
  }

  const token = core.getInput('token', {required: true})
  const octokit = github.getOctokit(token)
  const service = new Service(octokit)

  try {
    /** Get issue info */
    let issueBody: string | null | undefined = contextPayload.issue?.body
    if (!issueBody) {
      const issue = (
        await octokit.rest.issues.get({
          ...repo,
          issue_number: issue_number
        })
      ).data

      /** Stop if issue is pull request */
      if (issue.pull_request) {
        core.setFailed('Issue is pull request!')
        return
      }

      issueBody = issue.body
      if (!issueBody) {
        core.setFailed('Issue body null or empty!')
        return
      }
    }

    /** Run */
    const payload = new Payload(context, issueBody)
    const action = new Action(payload, service)
    await action.run()
  }
  catch (error: any) {
    await service
      .createComment(
        context.issue,
        `Error: ${error.message}\r\n${Action.footer}`
      )
      .catch(err => console.log('Comment error:', err))

    console.error(error)
    core.setFailed(error.message)
  }
}

run()
