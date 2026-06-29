// ===== CONFIG — ImgBB API Key (replace after signing up at imgbb.com/api) =====
const IMGBB_API_KEY = 'e999e25cabe972263da65749bb29adf1';

// ===== Mobile nav =====
const navToggle = document.getElementById('navToggle');
const mainNav   = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ===== Pre-select course from card =====
const courseSelect = document.getElementById('course');
document.querySelectorAll('[data-course]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (courseSelect) courseSelect.value = btn.getAttribute('data-course');
  });
});

// ===== Enrollment form — Formspree AJAX =====
const enrollForm  = document.getElementById('enrollForm');
const formFields  = document.getElementById('formFields');
const formSuccess = document.getElementById('formSuccess');
const submitBtn   = document.getElementById('submitBtn');

// Store last submission data for screenshot
let lastSubmission = {};

enrollForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!enrollForm.checkValidity()) { enrollForm.reportValidity(); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  try {
    const data = new FormData(enrollForm);
    const response = await fetch(enrollForm.action, {
      method: 'POST', body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      // Save to localStorage for admin panel
      const entry = {
        id: Date.now(),
        date: new Date().toLocaleString('en-PK'),
        studentName:   data.get('studentName'),
        studentAge:    data.get('studentAge'),
        course:        data.get('course'),
        country:       data.get('country'),
        parentName:    data.get('parentName'),
        whatsapp:      data.get('whatsapp'),
        email:         data.get('email'),
        preferredTime: data.get('preferredTime'),
        message:       data.get('message'),
        status:        'Pending',
        screenshotUrl: ''
      };
      const existing = JSON.parse(localStorage.getItem('ah_enrollments') || '[]');
      existing.unshift(entry);
      localStorage.setItem('ah_enrollments', JSON.stringify(existing));
      lastSubmission = { id: entry.id, name: data.get('studentName'), whatsapp: data.get('whatsapp') };

      formFields.hidden  = true;
      formSuccess.hidden = false;
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Enrollment →';
      alert('Something went wrong. Please WhatsApp us at +92 305 2972902');
    }
  } catch (err) {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Submit Enrollment →';
    alert('Network error. Please WhatsApp us at +92 305 2972902');
  }
});

// ===== Screenshot preview =====
const screenshotFile = document.getElementById('screenshotFile');
if (screenshotFile) {
  screenshotFile.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('previewImg').src = e.target.result;
      document.getElementById('uploadArea').style.display = 'none';
      document.getElementById('uploadPreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

// ===== Upload screenshot to ImgBB =====
async function submitScreenshot() {
  const file = document.getElementById('screenshotFile').files[0];
  if (!file) return;

  const uploadBtn = document.getElementById('uploadBtn');
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading…';

  try {
    // If no ImgBB key yet, just save locally and show success
    if (IMGBB_API_KEY === 'REPLACE_WITH_IMGBB_KEY') {
      showUploadSuccess('screenshot-pending');
      return;
    }

    const b64 = await fileToBase64(file);
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', b64.split(',')[1]);
    formData.append('name', `payment_${lastSubmission.name || 'student'}_${Date.now()}`);

    const res  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (json.success) {
      const imgUrl = json.data.url;
      // Save URL to localStorage entry
      const arr = JSON.parse(localStorage.getItem('ah_enrollments') || '[]');
      const idx = arr.findIndex(e => e.id === lastSubmission.id);
      if (idx > -1) { arr[idx].screenshotUrl = imgUrl; arr[idx].status = 'Paid'; }
      localStorage.setItem('ah_enrollments', JSON.stringify(arr));

      // Also send to Formspree with screenshot URL
      await fetch('https://formspree.io/f/maqgynba', {
        method: 'POST',
        body: JSON.stringify({
          _subject: `Payment Screenshot — ${lastSubmission.name}`,
          student: lastSubmission.name,
          whatsapp: lastSubmission.whatsapp,
          screenshot_url: imgUrl,
          note: 'Student has uploaded payment proof.'
        }),
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });

      showUploadSuccess(imgUrl);
    } else {
      throw new Error('ImgBB upload failed');
    }
  } catch (err) {
    uploadBtn.disabled    = false;
    uploadBtn.textContent = '✓ Submit Payment Proof';
    alert('Upload failed. Please send the screenshot via WhatsApp to +92 305 2972902');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = () => reject(new Error('Read failed'));
    r.readAsDataURL(file);
  });
}

function showUploadSuccess(url) {
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('uploadSuccess').style.display = 'block';
}
