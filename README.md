# Cancel obsolete runs

A simple action to cancel a job that is running for an unsync pull request or push.
Say you have a workflow that is triggered by pull_request or push events. When a new commit is pushed to the same branch, the result of that workflow is not longer valid, therefor you should cancel it.
This action does just that.

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

