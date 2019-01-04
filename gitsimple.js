const git = require('simple-git/promise');

async function gitInfo(workingDir) {
    let statusSummary = null;
    try {
        statusSummary = await git(workingDir).status();

    } catch (e) {
        console.log(e)
    }
    try {
        latest = await git(workingDir).log();

    } catch (e) {
        console.log(e)
    }
    try {
        remoteUrl = await git(workingDir).listRemote(['--get-url']);
    } catch (e) {
        console.log(e)
    }
    return {
        git: {
            modified_files: statusSummary.modified,
            added_files: statusSummary.not_added,
            branch: statusSummary.current,
            commit: latest.latest.hash.substr(0, 7),
            message: latest.latest.message,
            date: latest.latest.date,
            author: `${latest.latest.author_name} (${latest.latest.author_email})`,
            url: `${remoteUrl.startsWith("git@") && remoteUrl.endsWith(".git\n") ? remoteUrl.replace(':', '/').replace('git@', 'https://').trim().slice(0,-4) : remoteUrl}/commit/${latest.latest.hash.substr(0, 7)}`
        }
    }
}

// using the async function
// (async () => {
//     const thing = await gitInfo('~/development/partner-wires')
//     console.log(thing)
// })();

module.exports = gitInfo