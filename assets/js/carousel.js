document.addEventListener('DOMContentLoaded', function() {
  const carousel = document.getElementById('carousel-container');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  let currentSlide = 0;
  const totalSlides = 4; // Nous avons 4 sections
  
  // Variables pour le glissement
  let startX, moveX, initialPosition;
  let isDragging = false;
  
  // Fonction pour mettre à jour l'affichage du carousel
  function updateCarousel() {
    carousel.style.transform = `translateX(-${currentSlide * 25}%)`; // 25% car nous avons 4 sections (100/4)
  }
  
  // Boutons de navigation
  prevBtn.addEventListener('click', function() {
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
  });
  
  nextBtn.addEventListener('click', function() {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateCarousel();
    }
  });
  
  // Fonctions pour le glissement tactile et souris
  carousel.addEventListener('mousedown', dragStart);
  carousel.addEventListener('touchstart', dragStart, { passive: false });
  
  carousel.addEventListener('mousemove', drag);
  carousel.addEventListener('touchmove', drag, { passive: false });
  
  carousel.addEventListener('mouseup', dragEnd);
  carousel.addEventListener('touchend', dragEnd);
  
  carousel.addEventListener('mouseleave', dragEnd);
  
  function dragStart(e) {
    isDragging = true;
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    initialPosition = -currentSlide * 25; // Position initiale en pourcentage
    
    // Ajouter une classe pour changer le curseur
    carousel.classList.add('grabbing');
    
    // Empêcher le comportement par défaut (important pour le tactile)
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    // Empêcher le défilement de la page pendant le glissement
    e.preventDefault();
    
    moveX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    
    // Calcul du déplacement en pourcentage de la largeur du carousel
    const diffX = moveX - startX;
    const percentageMoved = (diffX / carousel.parentElement.offsetWidth) * 100;
    
    // Limiter le glissement avec un effet d'élasticité
    let newPosition = initialPosition + percentageMoved;
    
    // Appliquer une résistance aux bords
    if (newPosition > 0) {
      newPosition = newPosition * 0.3; // Résistance accrue au début
    } else if (newPosition < -(totalSlides - 1) * 25) {
      const overscroll = newPosition + (totalSlides - 1) * 25;
      newPosition = -(totalSlides - 1) * 25 + overscroll * 0.3; // Résistance à la fin
    }
    
    // Appliquer la transformation
    carousel.style.transform = `translateX(${newPosition}%)`;
  }
  
  function dragEnd(e) {
    if (!isDragging) return;
    
    isDragging = false;
    carousel.classList.remove('grabbing');
    
    // Si pas de mouvement, ne rien faire
    if (!moveX) return;
    
    const movedBy = moveX - startX;
    const thresholdDistance = carousel.parentElement.offsetWidth * 0.15; // 15% de la largeur
    
    // Déterminer la direction du swipe
    if (movedBy < -thresholdDistance && currentSlide < totalSlides - 1) {
      currentSlide++;
    } else if (movedBy > thresholdDistance && currentSlide > 0) {
      currentSlide--;
    }
    
    // Animer vers la position finale
    updateCarousel();
    
    // Réinitialiser les variables
    startX = null;
    moveX = null;
  }
  
  // Navigation au clavier (optionnel)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft' && currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    } else if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) {
      currentSlide++;
      updateCarousel();
    }
  });
});