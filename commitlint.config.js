module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Code style (formatting, semicolons, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'chore',    // Maintenance tasks
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert'    // Revert a commit
      ]
    ],
    'subject-case': [0], // Disable subject case check
    'body-max-line-length': [0] // Disable body line length check
  }
};
