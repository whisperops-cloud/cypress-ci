const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "1mc19a"
  video: true, // Active l'enregistrement vidéo
  videoCompression: 32, // Optionnel : compresse pour réduire la taille (0 à 51)
  videosFolder: 'cypress/videos', // Tu peux même changer le dossier ici
  screenshotOnRunFailure: true,
  
  e2e: {

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
