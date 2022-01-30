const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/action");


function extractSourceBranchFromPRPayload(eventPayload) {
  if (eventPayload.pull_request) {
    let head=eventPayload.pull_request.head
    if(head){
      let branch=head.ref
      
      let part=branch.split('/')
      if (part.length>0) {
        return part[part.length-1] 
      }else{
        return branch
      }
    }
  }
  return ""
}

function extractSourceBranchFromPushPayload(eventPayload) {
  if (eventPayload.ref) {
    let branch = eventPayload.ref
    let parts = branch.split('/')
    if (Array.isArray(parts) && parts.length > 0) {
      return parts[parts.length - 1]
    } else {
      return branch
    }
  }
  return ""
}

async function getWorkflowID(workflowName) {
  let octo = github.getOctokit(core.getInput('token'))
  let response = await octo.rest.actions.listRepoWorkflows({
    "owner": github.context.repo.owner,
    "repo": github.context.repo.repo

  })
  //console.log(JSON.stringify(response.data, ' ', 2))
  for (let index = 0; index < response.data.workflows.length; index++) {
    const workflow = response.data.workflows[index];
    if(workflow.name==workflowName || workflow.path==workflowName){
      return `${workflow.id}`
    }
  }  
  return ""
}

async function getOboleteRuns(sourceBranch, workflowID) {
  console.log(`Source branch: '${sourceBranch}'. Workflow name: '${workflowID}'`)


  let octo = github.getOctokit(core.getInput('token'))
  console.log(`Getting all runs`)
  let response = await octo.rest.actions.listWorkflowRuns({
    "owner": github.context.repo.owner,
    "repo": github.context.repo.repo,
    workflow_id: workflowID
  })

  //console.log(`Response is ${JSON.stringify(response)}`)

  if (response.status != 200) {
    console.log('Failed to get workflow history. return empty history')
    return []
  }

  let obsoleteRuns = []
  let firstHit = true
  console.log(`Has ${response.data.workflow_runs.length} workflows`)
  if (Array.isArray(response.data.workflow_runs) && response.data.workflow_runs.length > 1)  //should have atleast one run element (the current run)
    for (let index = 0; index < response.data.workflow_runs.length; index++) {
      const run = response.data.workflow_runs[index];
      if (!firstHit) {  //The first run is the current run
        //console.log(`Testing run ${JSON.stringify(run, ' ', 2)}`)
        
        let head=""
        if(run.event=="pull_request"){
          head=run.head_branch
          let parts=head.split('/')
          if(parts.length>0){
            head=parts[parts.length-1]
          }
        }else if(run.event=="push"){
          head=run.head_branch
        }
        

        //console.log(`Run Pr ${JSON.stringify(pr, ' ', 2)}`)

        if (head == sourceBranch) {
          if ((run.status == "queued" || run.status == "in_progress")) {
            //console.log(`Adding run ${run.id}`)
            obsoleteRuns.push({
              id: run.id,
              status: run.status,
              cancelUrl: run.cancel_url
            })
          }
        }
      }//if not first hit
      firstHit = false
    }

  console.log(`Returning obsolete jobs ${JSON.stringify(obsoleteRuns, ' ', 2)}`)
  return obsoleteRuns
}

async function cancelRun(runInfo) {
  console.log(`Canceling run ${runInfo.id}`)
  let octo = github.getOctokit(core.getInput('token'))
  let respo = await octo.rest.actions.cancelWorkflowRun({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    run_id: runInfo.id
  })
  console.log(`Cancel run result ${respo.status}`)
  //console.log(`Cancel run ${runInfo.id} response: ${JSON.stringify(respo, ' ', 2)}`)
}


async function main() {
  try {
    // Get the JSON webhook payload for the event that triggered the workflow
    const eventName = github.context.eventName;
    console.log(`Event name: '${eventName}'`)
    //const githubContext = JSON.stringify(github.context, undefined, 2)
    //console.log(`github context: ${githubContext}`);


    let workflowName = github.context.workflow
    let workflowID=await getWorkflowID(workflowName)
    

    let sourceBranch = ""
    if (eventName == "pull_request") {
      sourceBranch = extractSourceBranchFromPRPayload(github.context.payload)
    } else if (eventName == "push") {
      sourceBranch = extractSourceBranchFromPushPayload(github.context.payload)
    }


    if (!sourceBranch || !workflowID) {
      console.log(`Cannot cancel history. source branch '${sourceBranch}' or workflow id '${workflowID}' are empty`)
      return
    }



    let obsoleteRunsList = await getOboleteRuns(sourceBranch, workflowID)
    console.log(`Start canceling runs, ${JSON.stringify(obsoleteRunsList)}`)
    for (let index = 0; index < obsoleteRunsList.length; index++) {
      const run = obsoleteRunsList[index];
      await cancelRun(run)
    }
    console.log('Done canceling runs')


  } catch (error) {
    core.setFailed(error.message);
  }

}


main()