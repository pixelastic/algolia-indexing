import chalk from 'chalk';
import shell from 'shelljs';
import prompt from 'prompt';
import pify from 'pify';
import semver from 'semver';
import mversion from 'mversion';
import packageJson from '../package.json';
import childProcess from 'child_process';
const promptGet = pify(prompt.get);
const mversionUpdate = pify(mversion.update);

const release = {
  isRunWithNpm() {
    return process.env._.match(/npm$/);
  },
  git(command) {
    return this.shell(`git ${command}`);
  },
  gitCurrentBranch() {
    return this.git('rev-parse --abbrev-ref HEAD');
  },
  gitHasUnstagedChanges() {
    return this.git('status --porcelain').length > 0;
  },
  gitLastTag() {
    try {
      return this.git('describe --tags --abbrev=0');
    } catch (err) {
      return '';
    }
  },
  gitChangelogSince(boundary) {
    const pattern = boundary ? `${boundary}..HEAD` : '';
    return this.git(`log ${pattern} --format=%B`).replace('\n\n', '\n');
  },
  shell(command) {
    const result = shell.exec(command, { silent: true });
    if (result.code !== 0) {
      throw new Error(result.stderr);
    }
    return result.toString().trim();
  },
  // Make sure the command is run with npm run and not yarn run
  assertRunWithNpm() {
    if (this.isRunWithNpm()) {
      return;
    }
    const badCommand = chalk.red('yarn run release');
    const goodCommand = chalk.bold.green('npm run release');
    const errorTitle = 'This script cannot be run through yarn';
    const errorDescription = `Please use ${goodCommand} instead of ${badCommand}`;
    const message = [chalk.red(errorTitle), errorDescription].join('\n');
    throw new Error(message);
  },
  // Making sure the command is run from the develop branch
  assertRunOnDevelop() {
    const currentBranch = this.gitCurrentBranch();
    if (currentBranch !== 'develop') {
      const goodBranch = chalk.bold.green('develop');
      const badBranch = chalk.red(currentBranch);
      const message = [
        chalk.red(`This script must be run from ${goodBranch}.`),
        `You are currently on ${badBranch}, please switch to ${goodBranch} and try again`,
      ].join('\n');
      throw new Error(message);
    }

    const hasUnstagedChanges = this.gitHasUnstagedChanges();
    if (hasUnstagedChanges) {
      const message = [
        chalk.red(`You have some uncommited changes`),
        chalk.yellow(`Please, commit (or stash) your changes and try again`),
      ].join('\n');
      throw new Error(message);
    }
  },
  // Update current develop with all the changes from master
  updateDevelopFromMaster() {
    console.info('Updating develop with master...');
    this.git('checkout master');
    this.git('pull --rebase origin master');
    this.git('checkout develop');
    this.git('rebase master');
  },
  // Update the master branch with the new release and go back to develop
  updateMasterFromDevelop() {
    console.info('Updating master with develop...');
    this.git('checkout master');
    this.git('rebase develop');
    this.git('push');
    this.git('checkout develop');
  },
  // Open a prompt to ask for the new version number
  async askForNewVersion() {
    const currentVersion = packageJson.version;
    const question = `Next version? (current version is ${chalk.green.bold(
      currentVersion
    )})`;
    const isVersionValid = function(nextVersion) {
      return (
        semver.valid(nextVersion) && semver.gte(nextVersion, currentVersion)
      );
    };
    const errorMessage = chalk.red(
      `The version must follow the MAJOR.MINOR.PATCH pattern and be greater than ${chalk.bold.green(
        currentVersion
      )}`
    );
    const promptConfig = {
      required: true,
      description: question,
      conform: isVersionValid,
      message: errorMessage,
    };

    prompt.message = chalk.yellow('?');
    prompt.colors = false;
    prompt.start();

    const result = await promptGet([promptConfig]);
    return result.question;
  },
  // Update the version number in all files
  async updateVersion(newVersion) {
    console.info('Updating version in package.json...');
    try {
      await mversionUpdate(newVersion);
    } catch (err) {
      const message = chalk.red(`Unable to update version`);
      throw new Error(message);
    }
  },
  // Build the final files
  buildFiles() {
    console.info('Building JavaScript files...');
    this.shell('npm run build');
  },
  // Commit the new files and create a tag on this commit
  gitCommitAndTag(newVersion) {
    // Commit changes
    console.info('Commiting changes...');
    const commitMessage = `release ${newVersion}`;
    this.git(`commit -a -m '${commitMessage}'`);

    // Create a new tag with custom description
    // Note that it's not possible to open an editor to define the tag
    // description in git like you can do with a commit. So we'll first create
    // the tag, then edit it.
    const lastTag = this.gitLastTag();
    const changelog = this.gitChangelogSince(lastTag);
    this.git(`tag -a ${newVersion} -m "${changelog}"`);

    // Shelljs does not support interactive shell, we defer to native
    // childProcess
    childProcess.execFileSync(
      'git',
      ['tag', newVersion, newVersion, '-f', '-a'],
      { stdio: 'inherit' }
    );
  },
  // Publish the built files to NPM
  async publishToNpm() {
    console.info('Publishing to npm...');
    const oneTimePass = await this.askForOneTimePass();
    this.shell(`npm publish --otp=${oneTimePass}`);
  },
  async askForOneTimePass() {
    const question = `Enter your 2FA code`;
    const promptConfig = {
      required: true,
      description: question,
    };

    prompt.message = chalk.yellow('?');
    prompt.colors = false;
    prompt.start();

    const result = await promptGet([promptConfig]);
    return result.question;
  },
  // Push all tags to git
  pushTagsToGit() {
    console.info('Pushing tags to GitHub...');
    this.git('push origin');
    this.git('push origin --tags');
  },
};

(async function() {
  try {
    // Sanity checks
    release.assertRunWithNpm();
    release.assertRunOnDevelop();

    release.updateDevelopFromMaster();
    const newVersion = await release.askForNewVersion();
    await release.updateVersion(newVersion);
    release.buildFiles();
    release.gitCommitAndTag(newVersion);
    await release.publishToNpm();
    release.pushTagsToGit();
    release.updateMasterFromDevelop();
  } catch (err) {
    console.info(chalk.red('✘ ERROR:'));
    console.info(err.message);
    process.exit(1); // eslint-disable-line no-process-exit
  }
})();
