# Cancel obsolete runs

This action will cancel any job that is running for an unsync pull request or push.
Say you have a workflow that is triggered when you have a PR. The run becomes obsolete if a new commit is pushed to the branch of the PR. From that point on, there is no need to continue the old run.

Also in case of push event. If another push was made to the same branch and it had triggered the same workflow, this job cancel the previous run.

This action only needs current run token. That is easly obtain from `secrets.GITHUB_TOKEN`.

## Inputs

- `token` - The token of the current build. That can be passed by `${{secrets.GITHUB_TOKEN}}`

## Example usage
```
on: 
  pull_request:
    types: [opened,reopened,synchronize]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: cancel old runs
        uses: sagiforbes/cancel-obsolete-runs@v1
        with:
          token: ${{secrets.GITHUB_TOKEN}}
      - name: delay
        run: |
          echo running delay
          env
          sleep 300

```

