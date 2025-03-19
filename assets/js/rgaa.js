document.addEventListener('DOMContentLoaded', function() {
  // Éléments
  const accessibilityToggle = document.getElementById('accessibility-toggle');
  const accessibilityPanel = document.getElementById('accessibility-panel');
  const closeAccessibility = document.getElementById('close-accessibility');
  const increaseText = document.getElementById('increase-text');
  const decreaseText = document.getElementById('decrease-text');
  const resetText = document.getElementById('reset-text');
  const toggleContrast = document.getElementById('toggle-contrast');
  const toggleSpeech = document.getElementById('toggle-speech');
  const pauseSpeech = document.getElementById('pause-speech');
  const stopSpeech = document.getElementById('stop-speech');
  const nextSection = document.getElementById('next-section');
  
  // Variables
  let currentFontSize = 100; // pourcentage
  let isReading = false;
  let speechPaused = false;
  let currentUtterance = null;
  let readingSections = [];
  let currentSectionIndex = -1;
  
  // Fonction pour fermer la navbar mobile
  function closeMobileNav() {
      // Vérifier si le mode mobile est actif
      const body = document.querySelector('body');
      if (body.classList.contains('mobile-nav-active')) {
          // Retirer la classe qui active la navigation mobile
          body.classList.remove('mobile-nav-active');
          
          // Mettre à jour l'icône du bouton toggle
          const navbarToggle = document.querySelector('.mobile-nav-toggle');
          if (navbarToggle) {
              if (navbarToggle.classList.contains('bi-x')) {
                  navbarToggle.classList.remove('bi-x');
                  navbarToggle.classList.add('bi-list');
              }
          }
      }
  }
  
  // Ouvrir/fermer le panneau d'accessibilité
  accessibilityToggle.addEventListener('click', function(e) {
      e.preventDefault();
      accessibilityPanel.classList.toggle('active');
      
      // Fermer la navbar mobile lorsqu'on clique sur le bouton d'accessibilité
      closeMobileNav();
  });
  
  closeAccessibility.addEventListener('click', function() {
      accessibilityPanel.classList.remove('active');
  });
  
  // Gestion de la taille du texte
  increaseText.addEventListener('click', function() {
      if (currentFontSize < 200) {
          currentFontSize += 10;
          updateFontSize();
      }
  });
  
  decreaseText.addEventListener('click', function() {
      if (currentFontSize > 70) {
          currentFontSize -= 10;
          updateFontSize();
      }
  });
  
  resetText.addEventListener('click', function() {
      currentFontSize = 100;
      updateFontSize();
  });
  
  function updateFontSize() {
      document.body.style.fontSize = currentFontSize + '%';
      // Stocker dans localStorage pour se souvenir du choix de l'utilisateur
      localStorage.setItem('accessibilityFontSize', currentFontSize);
  }
  
  // Gestion du contraste
  toggleContrast.addEventListener('click', function() {
      document.body.classList.toggle('high-contrast');
      toggleContrast.classList.toggle('active');
      const isHighContrast = document.body.classList.contains('high-contrast');
      localStorage.setItem('accessibilityHighContrast', isHighContrast);
  });
  
  // Gestion de la lecture vocale
  toggleSpeech.addEventListener('click', function() {
      if (isReading) {
          stopReading();
      } else {
          startReading();
      }
  });
  
  pauseSpeech.addEventListener('click', function() {
      if (speechPaused) {
          resumeReading();
      } else {
          pauseReading();
      }
  });
  
  stopSpeech.addEventListener('click', function() {
      stopReading();
  });
  
  // Gestionnaire d'événement pour le bouton "Section suivante"
  nextSection.addEventListener('click', function() {
      if (isReading && currentSectionIndex >= 0 && currentSectionIndex < readingSections.length) {
          // Annuler la lecture actuelle
          window.speechSynthesis.cancel();
          
          // Supprimer la mise en évidence de la section en cours
          readingSections[currentSectionIndex].classList.remove('reading-active');
          
          // Passer à la section suivante
          currentSectionIndex++;
          
          // Vérifier si nous avons atteint la fin
          if (currentSectionIndex >= readingSections.length) {
              stopReading();
          } else {
              // Lire la nouvelle section
              readCurrentSection();
          }
      }
  });
  
  function startReading() {
      if (!window.speechSynthesis) {
          alert("Votre navigateur ne prend pas en charge la synthèse vocale.");
          return;
      }
      
      // Collecter les sections à lire
      readingSections = collectReadableSections();
      if (readingSections.length === 0) return;
      
      // Activer les boutons et indiquer que la lecture est en cours
      isReading = true;
      speechPaused = false;
      pauseSpeech.disabled = false;
      stopSpeech.disabled = false;
      nextSection.disabled = false; // Activer le bouton "Section suivante"
      toggleSpeech.innerHTML = '<i class="bi bi-volume-mute"></i> Désactiver la lecture vocale';
      
      // Démarrer la lecture à partir de la première section
      currentSectionIndex = 0;
      readCurrentSection();
  }
  
  function pauseReading() {
      if (window.speechSynthesis) {
          window.speechSynthesis.pause();
          speechPaused = true;
          pauseSpeech.innerHTML = '<i class="bi bi-play"></i> Reprendre';
      }
  }
  
  function resumeReading() {
      if (window.speechSynthesis) {
          window.speechSynthesis.resume();
          speechPaused = false;
          pauseSpeech.innerHTML = '<i class="bi bi-pause"></i> Pause';
      }
  }
  
  function stopReading() {
      if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
      }
      
      // Réinitialiser l'état
      isReading = false;
      speechPaused = false;
      pauseSpeech.disabled = true;
      stopSpeech.disabled = true;
      nextSection.disabled = true; // Désactiver le bouton "Section suivante"
      toggleSpeech.innerHTML = '<i class="bi bi-volume-up"></i> Activer la lecture vocale';
      pauseSpeech.innerHTML = '<i class="bi bi-pause"></i> Pause';
      
      // Supprimer la mise en évidence de la section en cours
      if (currentSectionIndex >= 0 && currentSectionIndex < readingSections.length) {
          readingSections[currentSectionIndex].classList.remove('reading-active');
      }
      
      currentSectionIndex = -1;
  }
  
  function readCurrentSection() {
      if (currentSectionIndex < 0 || currentSectionIndex >= readingSections.length) {
          stopReading();
          return;
      }
      
      // Supprimer la mise en évidence de toutes les sections
      readingSections.forEach(section => {
          section.classList.remove('reading-active');
      });
      
      // Mettre en évidence la section en cours
      readingSections[currentSectionIndex].classList.add('reading-active');
      
      // Créer un nouvel utterance pour la section
      const text = readingSections[currentSectionIndex].textContent.trim();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Définir la langue (français)
      utterance.lang = 'fr-FR';
      
      // Configurer les événements
      utterance.onend = function() {
          // Passer à la section suivante
          currentSectionIndex++;
          readCurrentSection();
      };
      
      // Stocker l'utterance actuel et le lire
      currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      
      // Faire défiler la page jusqu'à la section en cours
      readingSections[currentSectionIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
      });
  }
  
  function collectReadableSections() {
      // Sélectionner les éléments contenant du texte significatif
      const sections = [];
      
      // Parcourir les sections principales
      document.querySelectorAll('section').forEach(section => {
          // Pour chaque section, collecter les paragraphes, titres, listes, etc.
          const elements = section.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, .details, .describe');
          elements.forEach(el => {
              if (el.textContent.trim().length > 0) {
                  sections.push(el);
              }
          });
      });
      
      return sections;
  }
  
  // Restaurer les préférences utilisateur depuis localStorage
  function restoreUserPreferences() {
      const savedFontSize = localStorage.getItem('accessibilityFontSize');
      if (savedFontSize) {
          currentFontSize = parseInt(savedFontSize);
          updateFontSize();
      }
      
      const savedHighContrast = localStorage.getItem('accessibilityHighContrast');
      if (savedHighContrast === 'true') {
          document.body.classList.add('high-contrast');
          toggleContrast.classList.add('active');
      }
  }
  
  // Initialiser les préférences utilisateur au chargement
  restoreUserPreferences();
  
  // Fermer le panneau si on clique en dehors
  document.addEventListener('click', function(e) {
      if (!accessibilityPanel.contains(e.target) && 
          !accessibilityToggle.contains(e.target) &&
          accessibilityPanel.classList.contains('active')) {
          accessibilityPanel.classList.remove('active');
      }
  });
  
  // Ajouter les attributs aria pour l'accessibilité
  function enhanceAccessibility() {
      // Ajouter des attributs role et aria aux éléments interactifs
      document.querySelectorAll('button, a').forEach(el => {
          if (!el.getAttribute('aria-label')) {
              el.setAttribute('aria-label', el.textContent.trim());
          }
      });
      
      // Améliorer la navigation au clavier
      document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').forEach(el => {
          el.addEventListener('focus', function() {
              this.style.outline = '2px solid #0078d7';
          });
          
          el.addEventListener('blur', function() {
              this.style.outline = '';
          });
      });
  }
  
  enhanceAccessibility();
});