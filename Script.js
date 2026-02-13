// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // -------------------------------------------------------
  // BACKEND URL (n8n Webhook):
  // Replace YOUR_N8N_DOMAIN with your actual n8n instance URL.
  // After importing the RSVP workflow, copy the Production Webhook URL here.
  // Example: 'https://your-n8n.app.n8n.cloud/webhook/submit-rsvp'
  // -------------------------------------------------------
  BACKEND_URL: 'https://nevo60.app.n8n.cloud/webhook/submit-rsvp',

  // Site Password
  SITE_PASSWORD: 'LaurenandSal2027Clearwater',

  // Animation settings
  ANIMATION_DELAY: 100,
  SCROLL_OFFSET: 100
};

// ========================================
// PASSWORD PROTECTION
// ========================================

const passwordOverlay = document.getElementById('passwordOverlay');
const mainContent = document.getElementById('mainContent');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('sitePassword');
const passwordError = document.getElementById('passwordError');

// Check if user has already authenticated
function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('weddingAuthenticated');
  if (isAuthenticated === 'true') {
    showMainContent();
  }
}

// Show main content and hide password overlay
function showMainContent() {
  passwordOverlay.classList.add('hidden');
  mainContent.classList.remove('hidden');
  sessionStorage.setItem('weddingAuthenticated', 'true');
}

// Handle password form submission
passwordForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const enteredPassword = passwordInput.value;

  if (enteredPassword === CONFIG.SITE_PASSWORD) {
    passwordError.style.display = 'none';
    showMainContent();
  } else {
    passwordError.style.display = 'block';
    passwordInput.value = '';
    passwordInput.focus();

    // Shake animation for error
    passwordInput.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      passwordInput.style.animation = '';
    }, 500);
  }
});

// Add shake animation via CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-10px); }
    40%, 80% { transform: translateX(10px); }
  }
`;
document.head.appendChild(style);

// Check authentication on page load
checkAuthentication();

// ========================================
// COUNTDOWN TIMER
// ========================================

const weddingDate = new Date('March 20, 2027 16:00:00').getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  if (distance > 0) {
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');

    if (daysEl) daysEl.textContent = days.toString().padStart(3, '0');
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
  }
}

// Update countdown every second
setInterval(updateCountdown, 1000);

// Initial call
updateCountdown();

// ========================================
// SMOOTH SCROLLING
// ========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ========================================
// SCROLL ANIMATIONS
// ========================================

const observerOptions = {
  threshold: 0.1,
  rootMargin: `0px 0px -${CONFIG.SCROLL_OFFSET}px 0px`
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, index * CONFIG.ANIMATION_DELAY);
    }
  });
}, observerOptions);

// Observe all fade-in-scroll elements
document.querySelectorAll('.fade-in-scroll').forEach(el => {
  observer.observe(el);
});

// ========================================
// PARALLAX EFFECT ON SCROLL
// ========================================

let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.hero-content');

      parallaxElements.forEach(el => {
        const speed = 0.5;
        el.style.transform = `translateY(${scrolled * speed}px)`;
      });

      ticking = false;
    });
    ticking = true;
  }
});

// ========================================
// PHOTO GALLERY LIGHTBOX
// ========================================

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.querySelector('.lightbox-caption');
const closeLightbox = document.querySelector('.close-lightbox');
const prevButton = document.querySelector('.lightbox-prev');
const nextButton = document.querySelector('.lightbox-next');

let currentImageIndex = 0;
const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));

// Open lightbox
galleryItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    currentImageIndex = index;
    openLightbox(index);
  });
});

function openLightbox(index) {
  const img = galleryItems[index].querySelector('.gallery-img');
  const caption = galleryItems[index].getAttribute('data-caption');

  lightboxImg.src = img.src;
  lightboxCaption.textContent = caption;
  lightbox.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// Close lightbox
closeLightbox.addEventListener('click', () => {
  lightbox.style.display = 'none';
  document.body.style.overflow = 'auto';
});

// Close on background click
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
});

// Navigation
prevButton.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex - 1 + galleryItems.length) % galleryItems.length;
  openLightbox(currentImageIndex);
});

nextButton.addEventListener('click', () => {
  currentImageIndex = (currentImageIndex + 1) % galleryItems.length;
  openLightbox(currentImageIndex);
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (lightbox.style.display === 'block') {
    if (e.key === 'Escape') {
      lightbox.style.display = 'none';
      document.body.style.overflow = 'auto';
    } else if (e.key === 'ArrowLeft') {
      prevButton.click();
    } else if (e.key === 'ArrowRight') {
      nextButton.click();
    }
  }
});

// ========================================
// FAQ ACCORDION
// ========================================

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');

  question.addEventListener('click', () => {
    // Close all other items
    faqItems.forEach(otherItem => {
      if (otherItem !== item && otherItem.classList.contains('active')) {
        otherItem.classList.remove('active');
      }
    });

    // Toggle current item
    item.classList.toggle('active');
  });
});

// ========================================
// PHONE NUMBER FORMATTING
// ========================================

const phoneInput = document.getElementById('phone');

phoneInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');

  if (value.length > 10) {
    value = value.substring(0, 10);
  }

  if (value.length >= 6) {
    value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
  } else if (value.length >= 3) {
    value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
  } else if (value.length > 0) {
    value = `(${value}`;
  }

  e.target.value = value;
});

// ========================================
// PLUS ONE FIELD TOGGLE
// ========================================

const guestCountSelect = document.getElementById('guestCount');
const plusOneSection = document.getElementById('plusOneSection');
const plusOneNameInput = document.getElementById('plusOneName');

guestCountSelect.addEventListener('change', (e) => {
  if (e.target.value === '2') {
    plusOneSection.style.display = 'block';
    plusOneNameInput.required = true;
    plusOneSection.style.animation = 'slideDown 0.3s ease';
  } else {
    plusOneSection.style.display = 'none';
    plusOneNameInput.required = false;
    plusOneNameInput.value = '';
  }
});

// ========================================
// SPECIAL REQUEST TOGGLE
// ========================================

const specialRequestCheckbox = document.getElementById('hasSpecialRequest');
const specialRequestSection = document.getElementById('specialRequestSection');
const specialRequestDetails = document.getElementById('specialRequestDetails');

specialRequestCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    specialRequestSection.style.display = 'block';
    specialRequestDetails.required = true;
    specialRequestSection.style.animation = 'slideDown 0.3s ease';
  } else {
    specialRequestSection.style.display = 'none';
    specialRequestDetails.required = false;
    specialRequestDetails.value = '';
  }
});

// ========================================
// FORM VALIDATION & SUBMISSION
// ========================================

const rsvpForm = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');
const submitButton = rsvpForm.querySelector('.submit-button');
const buttonText = submitButton.querySelector('.button-text');
const buttonLoader = submitButton.querySelector('.button-loader');

rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Disable submit button
  submitButton.disabled = true;
  buttonText.style.display = 'none';
  buttonLoader.style.display = 'inline-block';

  // Hide any previous messages
  formMessage.style.display = 'none';
  formMessage.className = 'form-message';

  try {
    // Validate plus-one name if applicable
    const guestCount = document.getElementById('guestCount').value;
    const plusOneName = document.getElementById('plusOneName').value.trim();

    if (guestCount === '2' && !plusOneName) {
      throw new Error('Please enter your plus one\'s name.');
    }

    // Validate special request details if applicable
    const hasSpecialRequest = document.getElementById('hasSpecialRequest').checked;
    const specialRequest = document.getElementById('specialRequestDetails').value.trim();

    if (hasSpecialRequest && !specialRequest) {
      throw new Error('Please describe your special accommodation needs.');
    }

    // Get form data
    const formData = {
      timestamp: new Date().toISOString(),
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      guestCount: guestCount,
      plusOneName: guestCount === '2' ? plusOneName : '',
      additionalNotes: document.getElementById('additionalNotes').value.trim(),
      hasSpecialRequest: hasSpecialRequest,
      specialRequestDetails: hasSpecialRequest ? specialRequest : '',
      ipAddress: await getUserIP()
    };

    // Validate email
    if (!isValidEmail(formData.email)) {
      throw new Error('Please enter a valid email address.');
    }

    // Validate phone
    if (!isValidPhone(formData.phone)) {
      throw new Error('Please enter a valid phone number.');
    }

    // Send to n8n webhook backend
    const response = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (result.status === 'success' || response.ok) {
      rsvpForm.reset();
      plusOneSection.style.display = 'none';
      specialRequestSection.style.display = 'none';
      showSuccessAnimation();

      if (formData.hasSpecialRequest) {
        showSpecialRequestNotification();
      }

      formMessage.textContent = '🎉 Thank you! Your RSVP has been received.';
      formMessage.className = 'form-message success';
      formMessage.style.display = 'block';
    } else {
      throw new Error(result.message || 'Something went wrong');
    }

  } catch (error) {
    console.error('Form submission error:', error);
    formMessage.textContent = error.message || 'Oops! Something went wrong. Please try again.';
    formMessage.className = 'form-message error';
    formMessage.style.display = 'block';
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    buttonText.style.display = 'inline-block';
    buttonLoader.style.display = 'none';
  }
});

// ========================================
// SUCCESS ANIMATION
// ========================================

const successOverlay = document.getElementById('successOverlay');
const successCloseBtn = document.getElementById('successCloseBtn');

function showSuccessAnimation() {
  // Show overlay
  successOverlay.classList.remove('hidden');

  // Create confetti
  createConfetti();

  // Play sound effect (optional)
  // new Audio('success.mp3').play();
}

function hideSuccessAnimation() {
  successOverlay.classList.add('hidden');

  // Remove all confetti
  document.querySelectorAll('.confetti').forEach(c => c.remove());
}

// Close button handler
successCloseBtn.addEventListener('click', hideSuccessAnimation);

// Also close on clicking overlay background
successOverlay.addEventListener('click', (e) => {
  if (e.target === successOverlay) {
    hideSuccessAnimation();
  }
});

// Create confetti effect
function createConfetti() {
  const colors = ['#ff4d7d', '#ff85a8', '#ffb3c6', '#4CAF50', '#8BC34A', '#FFD700', '#667eea'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    successOverlay.appendChild(confetti);
  }

  // Remove confetti after animation
  setTimeout(() => {
    document.querySelectorAll('.confetti').forEach(c => c.remove());
  }, 5000);
}

// ========================================
// SPECIAL REQUEST NOTIFICATION
// ========================================

function showSpecialRequestNotification() {
  // Create notification overlay
  const notification = document.createElement('div');
  notification.className = 'special-request-notification';
  notification.innerHTML = `
    <div class="special-notification-content">
      <div class="special-notification-icon">📬</div>
      <h3>Special Request Sent!</h3>
      <p>Your accommodation request has been forwarded to the bride and groom. They will review it and get back to you personally.</p>
      <button class="special-notification-close">Got it!</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Add animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Close button
  notification.querySelector('.special-notification-close').addEventListener('click', () => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  // Auto-close after 8 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  }, 8000);
}

// ========================================
// VALIDATION HELPERS
// ========================================

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
}

// ========================================
// GET USER IP ADDRESS
// ========================================

async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'Unable to fetch';
  }
}

// ========================================
// FORM FIELD ANIMATIONS
// ========================================

const formInputs = document.querySelectorAll('.form-group input, .form-group select, .form-group textarea');

formInputs.forEach(input => {
  // Add focus effect
  input.addEventListener('focus', () => {
    input.parentElement.style.transform = 'translateY(-2px)';
    input.parentElement.style.transition = 'transform 0.3s ease';
  });

  input.addEventListener('blur', () => {
    input.parentElement.style.transform = 'translateY(0)';
  });

  // Add filled class for styling
  input.addEventListener('input', () => {
    if (input.value.trim() !== '') {
      input.classList.add('filled');
    } else {
      input.classList.remove('filled');
    }
  });
});

// ========================================
// LAZY LOADING IMAGES
// ========================================

const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.5s ease';

      img.onload = () => {
        img.style.opacity = '1';
      };

      // If image is already cached, show it immediately
      if (img.complete) {
        img.style.opacity = '1';
      }

      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('.gallery-img, .venue-img').forEach(img => {
  imageObserver.observe(img);
});

// ========================================
// PREVENT DUPLICATE SUBMISSIONS
// ========================================

let isSubmitting = false;

rsvpForm.addEventListener('submit', (e) => {
  if (isSubmitting) {
    e.preventDefault();
    return false;
  }
  isSubmitting = true;

  // Reset after 5 seconds as a failsafe
  setTimeout(() => {
    isSubmitting = false;
  }, 5000);
});

// ========================================
// CONSOLE MESSAGE
// ========================================

console.log('%c💒 Sal & Lauren - March 20th, 2027 💒', 'font-size: 20px; font-weight: bold; color: #ff4d7d;');
console.log('%cHyatt Regency Clearwater Beach Resort and Spa', 'font-size: 14px; color: #666;');
console.log('%cBuilt with love 💕', 'font-size: 12px; color: #ff85a8;');

// ========================================
// PAGE LOAD COMPLETE
// ========================================

window.addEventListener('load', () => {
  // Add loaded class to body
  document.body.classList.add('loaded');

  // Initialize any additional animations
  console.log('Wedding website loaded successfully! 🎉');
});
