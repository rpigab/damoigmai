// On GitLab Pages the game is served at /damoigmai/
// Locally (dev server) it stays at /
export default {
  base: process.env.CI_PROJECT_NAME ? `/${process.env.CI_PROJECT_NAME}/` : '/',
};
