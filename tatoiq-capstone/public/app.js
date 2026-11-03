/*
 * TatoIQ contact form.
 *
 * Flow:
 *   1. Save the submission to Firestore `contacts` with the browser SDK.
 *      The rules allow create and deny every read, update, and delete.
 *   2. Ask the Python service to triage the saved record. The model key lives
 *      only in that service's environment, never in this file.
 *   3. Render what triage decided so the sender sees the same routing the
 *      owner sees. A triage failure never loses the message.
 */

const CONFIG = window.TATOIQ_CONFIG || {};
const API_BASE = String(CONFIG.apiBase || '').replace(/\/+$/, '');

const CATEGORY_LABEL = {
  new_business: 'New business',
  support: 'Client support',
  billing_or_money: 'Money / billing',
  partnership_or_press: 'Partnership / press',
  spam: 'Spam',
  unclear: 'Unclear',
};

const OWNER_LABEL = {
  cso: 'CSO — new business',
  cco: 'CCO — client care',
  owner: 'Owner',
  cmo: 'CMO — marketing',
};

const REPLY_LABEL = {
  sent: 'Sent by email',
  queued: 'Queued',
  skipped: 'Not sent — email is not configured',
  failed: 'Failed — the owner has been notified',
  none: 'No reply',
};

const REVIEW_REASON = {
  triage_unavailable: 'triage could not run',
  triage_unclear: 'we could not tell what was being asked',
  money_owner: 'money questions belong to the owner',
  no_reply_policy_partnership: 'partnership and press have no automatic reply',
  support_from_unknown_sender: 'support request from an address that is not in our client list',
  reply_failed: 'the reply could not be sent',
  email_not_configured: 'email is not configured',
};

const els = {
  form: document.getElementById('contact-form'),
  submit: document.getElementById('submit'),
  status: document.getElementById('status'),
  honeypot: document.getElementById('website'),
  message: document.getElementById('message'),
  count: document.getElementById('message-count'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultBadge: document.getElementById('result-badge'),
  resultCopy: document.getElementById('result-copy'),
  decision: document.getElementById('decision'),
  intent: document.getElementById('decision-intent'),
  category: document.getElementById('decision-category'),
  urgency: document.getElementById('decision-urgency'),
  owner: document.getElementById('decision-owner'),
  reply: document.getElementById('decision-reply'),
  review: document.getElementById('result-review'),
  resultId: document.getElementById('result-id'),
  year: document.getElementById('year'),
};

let firebasePromise = null;

function setStatus(text, tone) {
  els.status.textContent = text;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function setBusy(busy, label) {
  els.submit.disabled = busy;
  els.submit.textContent = busy ? label : 'Send message';
}

/** Firebase Hosting injects the public web config at /__/firebase/init.json. */
async function getFirebase() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(
          'Firebase config is unavailable. Run `firebase emulators:start --only hosting` instead of opening the file directly.',
        );
      }
      const firebaseConfig = await response.json();

      const [appModule, firestoreModule] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'),
      ]);

      const app = appModule.initializeApp(firebaseConfig);
      return {
        db: firestoreModule.getFirestore(app),
        addDoc: firestoreModule.addDoc,
        collection: firestoreModule.collection,
        serverTimestamp: firestoreModule.serverTimestamp,
      };
    })().catch((error) => {
      // Do not cache a failure: a later submit should retry the config fetch.
      firebasePromise = null;
      throw error;
    });
  }
  return firebasePromise;
}

function readForm() {
  const data = new FormData(els.form);
  return {
    name: String(data.get('name') || '').trim(),
    businessName: String(data.get('businessName') || '').trim(),
    email: String(data.get('email') || '').trim(),
    service: String(data.get('service') || '').trim(),
    industry: String(data.get('industry') || '').trim(),
    budget: String(data.get('budget') || '').trim(),
    timeline: String(data.get('timeline') || '').trim(),
    message: String(data.get('message') || '').trim(),
    website: String(data.get('website') || '').trim(),
  };
}

function validate(entry) {
  if (!entry.name) return { field: 'name', message: 'Please add your name.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry.email)) {
    return { field: 'email', message: 'That email address does not look right.' };
  }
  if (entry.message.length < 10) {
    return { field: 'message', message: 'Please add a little more detail.' };
  }
  return null;
}

// ── API call placeholder ────────────────────────────────────────────────────
// This is the only call to the Python service. The service holds OPENAI_API_KEY
// and the Firebase service account; neither is reachable from this file.
async function requestTriage(contactId) {
  const response = await fetch(`${API_BASE}/api/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_id: contactId }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || `Triage failed with ${response.status}.`);
  }
  return payload;
}

function renderSavedOnly(contactId) {
  els.result.hidden = false;
  els.decision.hidden = true;
  els.review.hidden = true;
  els.resultTitle.textContent = 'Message saved';
  els.resultBadge.textContent = 'saved';
  els.resultBadge.dataset.tone = 'grey';
  els.resultCopy.textContent =
    'Your message is in our records. Triage is offline right now, so a person will read it before replying.';
  els.resultId.textContent = `Reference: ${contactId}`;
}

function renderDecision(result, contactId) {
  const triage = result.triage || {};
  const reply = result.reply || {};
  const needsReview = Boolean(result.needsReview);
  const category = triage.category || 'unclear';

  els.result.hidden = false;
  els.decision.hidden = false;
  els.resultTitle.textContent = result.duplicate ? 'Already triaged' : 'Message received';
  els.resultBadge.textContent = needsReview ? 'needs a read' : 'routed';
  els.resultBadge.dataset.tone = needsReview ? 'warn' : 'ok';

  els.resultCopy.textContent = needsReview
    ? 'We have your message and a person will read it before anything else is promised.'
    : 'We have your message and routed it to the person who owns it.';

  els.intent.textContent = triage.intent || 'No intent recorded.';
  els.category.textContent = CATEGORY_LABEL[category] || category;
  els.urgency.textContent = triage.urgency || '—';
  els.owner.textContent = OWNER_LABEL[triage.owner] || triage.owner || '—';
  els.reply.textContent = REPLY_LABEL[reply.status] || reply.status || '—';

  if (needsReview) {
    const reason = REVIEW_REASON[result.reviewReason] || 'a person should look at this';
    els.review.hidden = false;
    els.review.textContent = `On the owner's reading list: ${reason}.`;
  } else {
    els.review.hidden = true;
  }

  els.resultId.textContent = `Reference: ${contactId}`;
}

function resetForm() {
  els.form.reset();
  els.count.textContent = '0';
}

els.message.addEventListener('input', () => {
  els.count.textContent = String(els.message.value.length);
});

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const entry = readForm();

  // Bot trap: a real person never fills this. Pretend it worked.
  if (entry.website) {
    setStatus('Message sent.', 'ok');
    resetForm();
    return;
  }

  const problem = validate(entry);
  if (problem) {
    setStatus(problem.message, 'error');
    document.getElementById(problem.field)?.focus();
    return;
  }

  setBusy(true, 'Saving…');
  setStatus('Saving your message…');

  try {
    const { db, addDoc, collection, serverTimestamp } = await getFirebase();

    const ref = await addDoc(collection(db, 'contacts'), {
      name: entry.name,
      businessName: entry.businessName,
      email: entry.email,
      service: entry.service,
      industry: entry.industry,
      budget: entry.budget,
      timeline: entry.timeline,
      message: entry.message,
      source: 'website-contact',
      createdAt: serverTimestamp(),
    });

    resetForm();
    setStatus('Saved. Reading your message…', 'ok');
    setBusy(true, 'Reading…');

    try {
      const result = await requestTriage(ref.id);
      renderDecision(result, ref.id);
      setStatus('Done. Check your inbox for one email.', 'ok');
    } catch (error) {
      console.warn('[tatoiq] triage unavailable:', error);
      renderSavedOnly(ref.id);
      setStatus('Saved. A person will read it before replying.', 'warn');
    }
  } catch (error) {
    console.error('[tatoiq] save failed:', error);
    setStatus('We could not save that. Please try again in a moment.', 'error');
  } finally {
    setBusy(false);
  }
});

if (els.year) els.year.textContent = String(new Date().getFullYear());
