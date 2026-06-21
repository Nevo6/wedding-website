// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // -------------------------------------------------------
  // BACKEND URL:
  // Points to the cloud-hosted backend API (Render).
  // -------------------------------------------------------
  BACKEND_URL: 'https://api.caramucci.com/submit-rsvp',

  // Tiered passwords: each unlocks the site AND determines RSVP permissions.
  // Tier 1: plus-one + kids | Tier 2: kids only | Tier 3: plus-one only | Tier 4: neither
  PASSWORDS: {
    'HyattRegency2027': { tier: 1, plusOne: true,  kids: true  },
    'HyattRegency':     { tier: 2, plusOne: false, kids: true  },
    'Clearwater':       { tier: 3, plusOne: true,  kids: false },
    'Clearwater2027':   { tier: 4, plusOne: false, kids: false }
  },

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

// Look up tier rules for a given password (case-sensitive — invitations print exactly).
function lookupTier(password) {
  return CONFIG.PASSWORDS[password] || null;
}

// Apply tier permissions to the document by toggling body classes.
// CSS rules in Styles.css use these classes to hide the corresponding RSVP sections:
//   body.no-plus-one         → hides .plus-one-block
//   body.no-kids             → hides .children-block
//   body.no-plus-one.no-kids → also reveals .only-me-notice (Tier 4)
function applyTier(rules) {
  document.body.classList.toggle('no-plus-one', !rules.plusOne);
  document.body.classList.toggle('no-kids', !rules.kids);
  document.body.dataset.tier = String(rules.tier);

  // Defensive cleanup — if a previous session had checkboxes set under a
  // different tier, uncheck them and clear their detail sections.
  if (!rules.plusOne) {
    const cb = document.getElementById('hasPlusOne');
    if (cb && cb.checked) {
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
    }
  }
  if (!rules.kids) {
    const cb = document.getElementById('hasChildren');
    if (cb && cb.checked) {
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
    }
  }
}

// Check if user has already authenticated and restore tier from session.
function checkAuthentication() {
  if (sessionStorage.getItem('weddingAuthenticated') !== 'true') return;
  const storedTier = sessionStorage.getItem('weddingTier');
  const rules = Object.values(CONFIG.PASSWORDS).find(r => String(r.tier) === storedTier);
  if (!rules) {
    // Tier missing/corrupted — force re-auth.
    sessionStorage.removeItem('weddingAuthenticated');
    return;
  }
  applyTier(rules);
  showMainContent();
}

// Show main content and hide password overlay.
function showMainContent() {
  passwordOverlay.classList.add('hidden');
  mainContent.classList.remove('hidden');
  sessionStorage.setItem('weddingAuthenticated', 'true');
  maybeWelcomeAgent();
}

// If the visitor just accepted their mission in the groomsmen portal, greet
// them by codename once, then clear the flag.
function maybeWelcomeAgent() {
  const name = sessionStorage.getItem('groomsmanCodename');
  if (!name) return;
  sessionStorage.removeItem('groomsmanCodename');

  const toast = document.createElement('div');
  toast.textContent = `Welcome aboard, Agent ${name}. Mission accepted. 🥂`;
  toast.style.cssText = [
    'position:fixed', 'left:50%', 'bottom:32px', 'transform:translateX(-50%) translateY(20px)',
    'z-index:9999', 'padding:14px 26px', 'background:#0a0a0d', 'color:#ecc874',
    'border:1px solid #c9a24b', 'box-shadow:0 0 28px rgba(201,162,75,0.45)',
    'font-family:Montserrat,sans-serif', 'letter-spacing:1px', 'font-size:14px',
    'border-radius:2px', 'opacity:0', 'transition:opacity .6s ease, transform .6s ease'
  ].join(';');
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 700);
  }, 5000);
}

// Secret clearance codes that route into the hidden groomsmen portal
// (Operation: April 2027) instead of unlocking the site directly.
const GROOMSMEN_CODES = ['Wyatt Rayner', 'James Lange', 'Jon Edwards', 'Joey PS4'];

// Handle password form submission.
passwordForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Easter egg: a groomsman's clearance code launches the recruitment portal.
  if (GROOMSMEN_CODES.includes(passwordInput.value.trim())) {
    window.location.href = '/groomsmen.html?code=' + encodeURIComponent(passwordInput.value.trim());
    return;
  }

  const rules = lookupTier(passwordInput.value);

  if (rules) {
    passwordError.style.display = 'none';
    sessionStorage.setItem('weddingTier', String(rules.tier));
    sessionStorage.setItem('weddingPassword', passwordInput.value); // backend re-validates
    applyTier(rules);
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

const weddingDate = new Date('April 24, 2027 16:00:00').getTime();

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

// Inject decorative corner brackets into each gallery frame
galleryItems.forEach(item => {
  ['tl', 'tr', 'bl', 'br'].forEach(pos => {
    const c = document.createElement('span');
    c.className = 'corner ' + pos;
    item.appendChild(c);
  });
});

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
// FAQ CATEGORY ACCORDION
// ========================================

// Category headers toggle
const faqCatHeaders = document.querySelectorAll('.faq-cat-header');
faqCatHeaders.forEach(header => {
  header.addEventListener('click', () => {
    const block = header.closest('.faq-category-block');
    // Close other categories
    document.querySelectorAll('.faq-category-block').forEach(other => {
      if (other !== block) other.classList.remove('open');
    });
    block.classList.toggle('open');
  });
});

// Individual FAQ questions within categories
const faqItems = document.querySelectorAll('.faq-cat-body .faq-item');
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  if (question) {
    question.addEventListener('click', () => {
      const toggle = question.querySelector('.faq-toggle');
      const isActive = item.classList.contains('active');
      // Close siblings
      item.closest('.faq-cat-body').querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('active');
        const otherToggle = other.querySelector('.faq-toggle');
        if (otherToggle) otherToggle.textContent = '+';
      });
      if (!isActive) {
        item.classList.add('active');
        if (toggle) toggle.textContent = '−';
      }
    });
  }
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
// PLUS-ONE TOGGLE (max 1, only when tier allows plus-one)
// ========================================

const hasPlusOneCheckbox = document.getElementById('hasPlusOne');
const plusOneDetailsSection = document.getElementById('plusOneDetailsSection');
const plusOneNameInput = document.getElementById('plusOneName');
const plusOnePhoneInput = document.getElementById('plusOnePhone');
const plusOneEmailInput = document.getElementById('plusOneEmail');

function setPlusOneRequired(required) {
  plusOneNameInput.required = required;
  plusOnePhoneInput.required = required;
  plusOneEmailInput.required = required;
}

hasPlusOneCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    plusOneDetailsSection.style.display = 'block';
    plusOneDetailsSection.style.animation = 'slideDown 0.3s ease';
    setPlusOneRequired(true);
  } else {
    plusOneDetailsSection.style.display = 'none';
    setPlusOneRequired(false);
    plusOneNameInput.value = '';
    plusOnePhoneInput.value = '';
    plusOneEmailInput.value = '';
  }
});

// Format plus-one phone the same way as the primary phone field.
plusOnePhoneInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 10) value = value.substring(0, 10);
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
// CHILDREN TOGGLE + DYNAMIC LIST (multiple, only when tier allows kids)
// ========================================

const hasChildrenCheckbox = document.getElementById('hasChildren');
const childrenDetailsSection = document.getElementById('childrenDetailsSection');
const childrenListContainer = document.getElementById('childrenListContainer');
const addChildBtn = document.getElementById('addChildBtn');

hasChildrenCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    childrenDetailsSection.style.display = 'block';
    childrenDetailsSection.style.animation = 'slideDown 0.3s ease';
    if (childrenListContainer.children.length === 0) {
      addChildRow();
    }
  } else {
    childrenDetailsSection.style.display = 'none';
    childrenListContainer.innerHTML = '';
  }
});

addChildBtn.addEventListener('click', () => addChildRow());

function addChildRow() {
  const row = document.createElement('div');
  row.className = 'child-row';
  row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; align-items: center; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'child-name';
  nameInput.placeholder = "Child's full name";
  nameInput.required = true;
  nameInput.style.cssText = 'flex: 1; min-width: 150px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;';

  const ageSelect = document.createElement('select');
  ageSelect.className = 'child-age';
  ageSelect.required = true;
  ageSelect.style.cssText = 'padding: 8px; border: 1px solid #ccc; border-radius: 4px;';
  ageSelect.innerHTML = `
    <option value="">Select Age...</option>
    <option value="Under 11">Child (Under 11)</option>
    <option value="12-20">Young Adult (12-20)</option>
  `;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.innerHTML = '✖';
  removeBtn.setAttribute('aria-label', 'Remove child');
  removeBtn.style.cssText = 'background: #c86828; color: #fffcf8; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;';
  removeBtn.addEventListener('click', () => {
    row.remove();
    if (childrenListContainer.children.length === 0) {
      hasChildrenCheckbox.checked = false;
      hasChildrenCheckbox.dispatchEvent(new Event('change'));
    }
  });

  row.appendChild(nameInput);
  row.appendChild(ageSelect);
  row.appendChild(removeBtn);
  childrenListContainer.appendChild(row);
}

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
    // Resolve tier from sessionStorage (set during password unlock)
    const tier = parseInt(sessionStorage.getItem('weddingTier'), 10);
    const password = sessionStorage.getItem('weddingPassword') || '';

    // Validate mailing address
    const mailingAddress = document.getElementById('mailingAddress').value.trim();
    if (!mailingAddress) {
      throw new Error('Please enter your mailing address.');
    }

    const tierAllowsPlusOne = !document.body.classList.contains('no-plus-one');
    const tierAllowsKids = !document.body.classList.contains('no-kids');

    // ----- Plus-one (max 1, only if tier allows) -----
    const hasPlusOne = tierAllowsPlusOne && hasPlusOneCheckbox.checked;
    const plusOneName = hasPlusOne ? plusOneNameInput.value.trim() : '';
    const plusOnePhone = hasPlusOne ? plusOnePhoneInput.value.trim() : '';
    const plusOneEmail = hasPlusOne ? plusOneEmailInput.value.trim() : '';

    if (hasPlusOne) {
      if (!plusOneName) throw new Error('Please enter your plus-one\'s full name.');
      if (!plusOnePhone || !isValidPhone(plusOnePhone)) throw new Error('Please enter a valid phone number for your plus-one.');
      if (!plusOneEmail || !isValidEmail(plusOneEmail)) throw new Error('Please enter a valid email for your plus-one.');
    }

    // ----- Children (multiple, only if tier allows) -----
    const hasChildren = tierAllowsKids && hasChildrenCheckbox.checked;
    const childrenList = [];
    let totalYoungAdults = 0;
    let totalChildren = 0;

    if (hasChildren) {
      const rows = childrenListContainer.querySelectorAll('.child-row');
      rows.forEach(row => {
        const name = row.querySelector('.child-name').value.trim();
        const age = row.querySelector('.child-age').value;
        if (name && age) {
          childrenList.push(`${name} (${age})`);
          if (age === '12-20') totalYoungAdults++;
          else if (age === 'Under 11') totalChildren++;
        }
      });
      if (rows.length > 0 && childrenList.length === 0) {
        throw new Error('Please complete each child\'s name and age, or remove empty rows.');
      }
      if (childrenList.length === 0) {
        throw new Error('Please add at least one child or uncheck "I am bringing children".');
      }
    }

    // Total adults = primary (1) + plus-one (0 or 1)
    const totalAdults = 1 + (hasPlusOne ? 1 : 0);

    // Get form data
    const formData = {
      timestamp: new Date().toISOString(),
      tier: tier,
      password: password,
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      mailingAddress: mailingAddress,
      hasPlusOne: hasPlusOne,
      plusOneName: plusOneName,
      plusOnePhone: plusOnePhone,
      plusOneEmail: plusOneEmail,
      hasChildren: hasChildren,
      childrenCount: childrenList.length,
      childrenList: childrenList.join(', '),
      totalAdults: totalAdults,
      totalYoungAdults: totalYoungAdults,
      totalChildren: totalChildren,
      additionalGuestsList: [
        ...(hasPlusOne ? [`${plusOneName} (Plus-One)`] : []),
        ...childrenList,
      ].join(', '),
      additionalNotes: document.getElementById('additionalNotes').value.trim(),
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

    let result = {};
    try {
      result = await response.json();
    } catch (e) {
      // n8n may return empty response - fall back to status check
    }

    if (result.status === 'success' || response.ok) {
      rsvpForm.reset();
      plusOneDetailsSection.style.display = 'none';
      childrenDetailsSection.style.display = 'none';
      childrenListContainer.innerHTML = '';
      setPlusOneRequired(false);
      showSuccessAnimation();

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
  const colors = ['#e8a840', '#c86828', '#f0d8a0', '#f5e8d0', '#7a3010', '#FFD700', '#5a98a8'];

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

console.log('%c💒 Sal & Lauren - April 24th, 2027 💒', 'font-size: 20px; font-weight: bold; color: #c86828;');
console.log('%cHyatt Regency Clearwater Beach Resort and Spa', 'font-size: 14px; color: #7a3010;');
console.log('%cBuilt with love 💕', 'font-size: 12px; color: #e8a840;');

// ========================================
// PAGE LOAD COMPLETE
// ========================================

window.addEventListener('load', () => {
  // Add loaded class to body
  document.body.classList.add('loaded');

  // Initialize any additional animations
  console.log('Wedding website loaded successfully! 🎉');
});

// ========================================
// NAVBAR
// ========================================

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const navbar = document.getElementById('navbar');

// Hamburger menu toggle
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('open');
  });
}

// Close menu when a link is clicked
navMenu.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('active');
    navMenu.classList.remove('open');
  });
});

// Scroll spy - highlight active section
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
const sections = [];
navLinks.forEach(link => {
  const id = link.getAttribute('href').substring(1);
  const section = document.getElementById(id);
  if (section) sections.push({ el: section, link: link });
});

function updateActiveNav() {
  const scrollPos = window.scrollY + 120;
  let current = sections[0];
  sections.forEach(s => {
    if (s.el.offsetTop <= scrollPos) current = s;
  });
  navLinks.forEach(l => l.classList.remove('active'));
  if (current) current.link.classList.add('active');
}

window.addEventListener('scroll', updateActiveNav);

// Hide navbar on scroll down, show on scroll up
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  if (currentScrollY > lastScrollY && currentScrollY > 200) {
    navbar.classList.add('nav-hidden');
  } else {
    navbar.classList.remove('nav-hidden');
  }
  lastScrollY = currentScrollY;
});

// ========================================
// ADD TO CALENDAR
// ========================================

(function setupAddToCalendar() {
  const btn = document.getElementById('addToCalendarBtn');
  const modal = document.getElementById('calendarModal');
  if (!btn || !modal) return;

  const closeBtn = document.getElementById('calendarModalClose');
  const googleLink = document.getElementById('calGoogle');
  const outlookLink = document.getElementById('calOutlook');

  // Event details
  const title = 'Sal & Lauren\'s Wedding';
  const description = 'Join us as we celebrate our wedding at the Hyatt Regency Clearwater Beach Resort & Spa. Ceremony begins at 5:30 PM. Cocktail attire (please avoid baby blue and white).';
  const location = 'Hyatt Regency Clearwater Beach Resort & Spa, 301 S Gulfview Blvd, Clearwater, FL 33767';
  const startDate = new Date('2027-04-24T17:00:00-04:00');
  const endDate = new Date('2027-04-24T23:00:00-04:00');

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toCalendarUTC(d) {
    return d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z';
  }

  const startUTC = toCalendarUTC(startDate);
  const endUTC = toCalendarUTC(endDate);

  // Google Calendar URL
  const googleUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(title) +
    '&dates=' + startUTC + '/' + endUTC +
    '&details=' + encodeURIComponent(description) +
    '&location=' + encodeURIComponent(location);
  googleLink.href = googleUrl;

  // Outlook Web URL (outlook.live.com for personal accounts)
  const outlookUrl = 'https://outlook.live.com/calendar/0/action/compose?rru=addevent' +
    '&subject=' + encodeURIComponent(title) +
    '&startdt=' + startDate.toISOString() +
    '&enddt=' + endDate.toISOString() +
    '&body=' + encodeURIComponent(description) +
    '&location=' + encodeURIComponent(location);
  outlookLink.href = outlookUrl;

  function openModal() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
})();

// ========================================
// MOBILE STICKY RSVP CTA — hide when RSVP section is in view
// ========================================
(function () {
  const cta = document.getElementById('mobileRsvpCta');
  const rsvp = document.getElementById('rsvp');
  if (!cta || !rsvp || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        cta.classList.toggle('is-hidden', entry.isIntersecting);
      });
    },
    { threshold: 0.15 }
  );
  observer.observe(rsvp);
})();

// ========================================
// COUPLE NAMES ROTATION
// (Handled entirely in CSS via @keyframes nameOrbit / nameCounterOrbit / heartSpin
//  on .couple-names-card. No JS needed.)
// ========================================

// ========================================
// HERO BACKGROUND ROTATION (every 10s)
// ========================================
(function rotateHeroBackground() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const photos = [
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9482.jpg',
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9093.jpg',
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9111.jpg',
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9308.jpg',
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9394.jpg',
    '/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-9440.jpg'
  ];

  // Create two layers for crossfade
  const layerA = document.createElement('div');
  const layerB = document.createElement('div');
  layerA.className = 'hero-bg-layer active';
  layerB.className = 'hero-bg-layer';
  layerA.style.backgroundImage = `linear-gradient(180deg, rgba(46,22,8,0.25) 0%, rgba(46,22,8,0.55) 100%), url('${photos[0]}')`;
  hero.insertBefore(layerB, hero.firstChild);
  hero.insertBefore(layerA, hero.firstChild);
  hero.classList.add('has-rotator');

  // Preload
  photos.forEach(src => { const img = new Image(); img.src = src; });

  let idx = 0;
  let activeIsA = true;
  setInterval(() => {
    idx = (idx + 1) % photos.length;
    const next = photos[idx];
    const incoming = activeIsA ? layerB : layerA;
    const outgoing = activeIsA ? layerA : layerB;
    incoming.style.backgroundImage = `linear-gradient(180deg, rgba(46,22,8,0.25) 0%, rgba(46,22,8,0.55) 100%), url('${next}')`;
    incoming.classList.add('active');
    outgoing.classList.remove('active');
    activeIsA = !activeIsA;
  }, 10000);
})();

// ========================================
// FULL ENGAGEMENT GALLERY ("View More Photos")
// ========================================

(function () {
  const galleryFiles = [
    '9061', '9093', '9094', '9111', '9113', '9118', '9132', '9229', '9248',
    '9252', '9254', '9289', '9308', '9322', '9349', '9374', '9402', '9426',
    '9440', '9462', '9464', '9475', '9482', '9485', '9492'
  ].map(n => `/static/Pictures/LaurenHayle-SandKeyBeach-ClearwaterFL-${n}.jpg`);

  const openBtn = document.getElementById('viewMorePhotosBtn');
  const modal = document.getElementById('fullGalleryModal');
  const grid = document.getElementById('fullGalleryGrid');
  const closeBtn = document.getElementById('fullGalleryClose');
  const viewer = document.getElementById('fgViewer');
  const viewerImg = document.getElementById('fgViewerImg');
  const viewerClose = document.getElementById('fgViewerClose');
  const viewerPrev = document.getElementById('fgViewerPrev');
  const viewerNext = document.getElementById('fgViewerNext');

  if (!openBtn || !modal || !grid) return;

  let built = false;
  let current = 0;

  function buildGrid() {
    if (built) return;
    galleryFiles.forEach((src, i) => {
      const fig = document.createElement('button');
      fig.className = 'fg-thumb';
      fig.type = 'button';
      fig.setAttribute('aria-label', `Open photo ${i + 1}`);
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = src;
      img.alt = `Engagement photo ${i + 1}`;
      fig.appendChild(img);
      fig.addEventListener('click', () => openViewer(i));
      grid.appendChild(fig);
    });
    built = true;
  }

  function openModal() {
    buildGrid();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    closeViewer();
    document.body.style.overflow = '';
  }

  function openViewer(index) {
    current = index;
    viewerImg.src = galleryFiles[current];
    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function closeViewer() {
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden', 'true');
  }

  function step(dir) {
    current = (current + dir + galleryFiles.length) % galleryFiles.length;
    viewerImg.src = galleryFiles[current];
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  viewerClose.addEventListener('click', closeViewer);
  viewerPrev.addEventListener('click', () => step(-1));
  viewerNext.addEventListener('click', () => step(1));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) closeViewer();
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (viewer.classList.contains('open')) {
      if (e.key === 'Escape') closeViewer();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });
})();
