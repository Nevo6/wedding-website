
// ========================================
// REGISTRY PAGE JAVASCRIPT
// ========================================

// -------------------------------------------------------
// Local Python Backend URL:
// Points to the locally-hosted Flask backend.
// Change this if running on a different host/port.
// -------------------------------------------------------
const API_URL = 'https://accompanying-scenes-grab-static.trycloudflare.com';
const YOUR_PAYPAL_ME_LINK = 'https://www.paypal.com/paypalme/YOURUSERNAME'; // Update with real link

// Fund Configuration
const FUND_CONFIG = {
  goal: 5000,
  raised: 0
};


// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  initializePieChart();
  initializeAmountButtons();
  initializeDonationForm();
  initializeDropdown();
  initializeExperienceCards();

  // Fetch initial data
  fetchFundStatus();
});

// ========================================
// DATA FETCHING
// ========================================

async function fetchFundStatus() {
  try {
    const response = await fetch(`${API_URL}/fund-status`);
    const data = await response.json();

    FUND_CONFIG.raised = data.totalRaised;
    FUND_CONFIG.goal = data.goal;

    updateFundDisplay();
    animatePieChart();
  } catch (error) {
    console.error('Error fetching fund status:', error);
    // Fallback to local storage or defaults if offline
  }
}

// ========================================
// DONATION FORM SUBMISSION
// ========================================

function initializeDonationForm() {
  const donateBtn = document.getElementById('donateBtn');
  const messageDiv = document.getElementById('donationMessage');

  donateBtn.addEventListener('click', async () => {
    // 1. Get Values
    const name = document.getElementById('donorName').value.trim();
    const email = document.getElementById('donorEmail').value.trim();
    const message = document.getElementById('donorMessage').value.trim();
    const giftType = document.getElementById('giftTypeSelect').value;
    const selectedBtn = document.querySelector('.amount-btn.active');

    let amount = 0;
    if (selectedBtn.dataset.amount === 'custom') {
      amount = document.getElementById('customAmount').value;
    } else {
      amount = selectedBtn.dataset.amount;
    }

    // 2. Validation
    if (!amount || amount <= 0) {
      alert('Please select or enter a valid amount.');
      return;
    }
    if (!name || !email) {
      alert('Please enter your name and email so we can thank you!');
      return;
    }

    // 3. UI Loading State
    const originalText = donateBtn.innerHTML;
    donateBtn.disabled = true;
    donateBtn.innerHTML = '<span>Processing...</span>';
    messageDiv.style.display = 'none';

    try {
      // 4. Send to Backend
      const response = await fetch(`${API_URL}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          amount,
          message,
          giftType: giftType,
          timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        // 5. Success UI
        messageDiv.textContent = '🎉 Thank you! Redirecting to PayPal...';
        messageDiv.style.color = 'green';
        messageDiv.style.display = 'block';

        // Update local display immediately
        FUND_CONFIG.raised = result.newTotal;
        updateFundDisplay();
        animatePieChart();

        // 6. Redirect to PayPal after delay
        setTimeout(() => {
          const finalUrl = `${YOUR_PAYPAL_ME_LINK}/${amount}`;
          window.open(finalUrl, '_blank');

          // Reset form
          donateBtn.disabled = false;
          donateBtn.innerHTML = originalText;
          document.getElementById('donorName').value = '';
          document.getElementById('donorEmail').value = '';
          document.getElementById('donorMessage').value = '';

          // Reset Dropdown
          document.getElementById('giftTypeSelect').selectedIndex = 0;
          updateMainVisuals();

        }, 1500);

      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Donation error:', error);
      messageDiv.textContent = '❌ Error processing donation. Please try again.';
      messageDiv.style.color = 'red';
      messageDiv.style.display = 'block';
      donateBtn.disabled = false;
      donateBtn.innerHTML = originalText;
    }
  });
}

// ========================================
// VISUALS & DROPDOWN LOGIC
// ========================================

function initializeDropdown() {
  const select = document.getElementById('giftTypeSelect');
  if (select) {
    select.addEventListener('change', () => {
      updateMainVisuals();
    });
  }
}

function updateMainVisuals() {
  const select = document.getElementById('giftTypeSelect');
  const mainIcon = document.getElementById('mainIcon');
  const mainTitle = document.getElementById('mainTitle');
  const fundTracker = document.getElementById('fundTracker');
  const itemVisual = document.getElementById('itemVisual');
  const itemVisualIcon = document.getElementById('itemVisualIcon');
  const itemVisualPrice = document.getElementById('itemVisualPrice');

  if (select && mainIcon && mainTitle) {
    const selectedOption = select.options[select.selectedIndex];
    const icon = selectedOption.getAttribute('data-icon');
    const title = selectedOption.text;
    const price = selectedOption.getAttribute('data-price');

    // Smooth transition
    mainIcon.style.opacity = '0';
    mainTitle.style.opacity = '0';

    // Toggle Tracker vs Item Visual
    if (select.value === 'Honeymoon Fund') {
      // Show Pie Chart
      fundTracker.style.display = 'block';
      itemVisual.style.display = 'none';

      setTimeout(() => {
        mainIcon.textContent = icon;
        mainTitle.textContent = 'Caribbean Dream Cruise';
        mainIcon.style.opacity = '1';
        mainTitle.style.opacity = '1';
      }, 200);

    } else {
      // Show Item Visual
      fundTracker.style.display = 'none';
      itemVisual.style.display = 'flex'; // flex for valid alignment

      // Update Item Visual Content
      itemVisualIcon.textContent = icon;
      itemVisualPrice.textContent = price ? `$${price}` : '';

      setTimeout(() => {
        mainIcon.textContent = icon;
        mainTitle.textContent = title;
        mainIcon.style.opacity = '1';
        mainTitle.style.opacity = '1';
      }, 200);
    }
  }
}

// ========================================
// PIE CHART FUNCTIONALITY
// ========================================

function initializePieChart() {
  // Add gradient definition to SVG
  const svg = document.querySelector('.pie-chart');
  if (svg && !document.getElementById('gradient')) { // Added check to prevent re-adding gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff85a8;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#ff4d7d;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#667eea;stop-opacity:1" />
      </linearGradient>
    `;
    svg.insertBefore(defs, svg.firstChild);

    // Set the gradient on the progress circle
    const progressCircle = document.getElementById('progressCircle');
    if (progressCircle) {
      progressCircle.style.stroke = 'url(#gradient)';
    }
  }
}

function updateFundDisplay() {
  const remaining = Math.max(0, FUND_CONFIG.goal - FUND_CONFIG.raised);
  const percent = Math.min(100, (FUND_CONFIG.raised / FUND_CONFIG.goal) * 100);

  // Update display elements
  document.getElementById('amountRemaining').textContent = formatCurrency(remaining);
  document.getElementById('totalRaised').textContent = formatCurrency(FUND_CONFIG.raised);
  document.getElementById('goalAmount').textContent = formatCurrency(FUND_CONFIG.goal);
  document.getElementById('percentComplete').textContent = `${Math.round(percent)}%`;
}

function animatePieChart() {
  const progressCircle = document.getElementById('progressCircle');
  if (!progressCircle) return;

  const percent = Math.min(100, (FUND_CONFIG.raised / FUND_CONFIG.goal) * 100);
  const circumference = 2 * Math.PI * 90; // radius is 90
  const offset = circumference - (percent / 100) * circumference;

  // Animate after a short delay
  setTimeout(() => {
    progressCircle.style.strokeDashoffset = offset;
  }, 300);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ========================================
// AMOUNT BUTTON FUNCTIONALITY
// ========================================

function initializeAmountButtons() {
  const buttons = document.querySelectorAll('.amount-btn');
  const customSection = document.getElementById('customAmountSection');
  const customInput = document.getElementById('customAmount');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const amount = btn.dataset.amount;

      if (amount === 'custom') {
        customSection.style.display = 'block';
        customInput.focus();
      } else {
        customSection.style.display = 'none';
      }
    });
  });

  // Set default active button
  const defaultBtn = document.querySelector('.amount-btn[data-amount="50"]');
  if (defaultBtn) {
    defaultBtn.classList.add('active');
  }
}

// ========================================
// STORE CARD ANIMATIONS
// ========================================

// Add hover sound effect (optional)
document.querySelectorAll('.store-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-5px) scale(1.02)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0) scale(1)';
  });
});

// ========================================
// EXPERIENCE CARDS - SELECTION LOGIC
// ========================================

function initializeExperienceCards() {
  document.querySelectorAll('.experience-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      // Get Details
      const priceText = card.querySelector('.experience-price').textContent;
      const amount = parseInt(priceText.replace(/[^0-9]/g, ''));
      const name = card.querySelector('h3').textContent;

      // Update Dropdown
      // Find option with matching value or text
      const select = document.getElementById('giftTypeSelect');
      let found = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.includes(name) || select.options[i].value === name) {
          select.selectedIndex = i;
          found = true;
          break;
        }
      }

      // Force update of visuals
      updateMainVisuals();

      // Scroll to form
      document.getElementById('honeymoon').scrollIntoView({ behavior: 'smooth' });

      // Select Custom Amount
      const buttons = document.querySelectorAll('.amount-btn');
      buttons.forEach(b => b.classList.remove('active'));

      const customBtn = document.querySelector('.amount-btn.custom');
      customBtn.classList.add('active');

      const customSection = document.getElementById('customAmountSection');
      const customInput = document.getElementById('customAmount');
      customSection.style.display = 'block';
      customInput.value = amount;

      // Force input event
      customInput.dispatchEvent(new Event('input'));
    });
  });
}

// ========================================
// SMOOTH SCROLL FOR ANCHOR LINKS
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
// INTERSECTION OBSERVER FOR ANIMATIONS
// ========================================

const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.store-card, .experience-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

