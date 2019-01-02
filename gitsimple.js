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
            author: latest.latest.author_name,
            url: remoteUrl.replace(':', '/').replace('git@', 'https://').trim()
        }
    }
}

// using the async function
(async () => {
    const thing = await gitInfo(__dirname)
    console.log(thing.git)
})();

module.exports = gitInfo