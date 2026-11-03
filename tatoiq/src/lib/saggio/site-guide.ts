/**
 * site-guide.ts — the small, verified map Saggio uses when a client asks where
 * something lives in the TatoIQ portal.
 *
 * Every href here corresponds to a real `page.tsx` in this repo. The test file
 * `site-guide.test.ts` checks that on disk, so Saggio cannot link to a page that
 * does not exist. Directions are intentionally conservative: they describe what
 * the page actually shows in this build, not what a future build might add.
 */

export interface GuideEntry {
  id: string;
  href: string;
  label: string;
  directions: string;
  keywords: string[];
}

export const SITE_GUIDE: GuideEntry[] = [
  {
    id: 'dashboard',
    href: '/dashboard',
    label: 'Dashboard',
    directions:
      'Open Dashboard in the left navigation. It gives you the top-level view of your return, documents, tasks, and messages.',
    keywords: ['dashboard', 'home', 'overview', 'start page', 'main page'],
  },
  {
    id: 'return',
    href: '/return',
    label: 'My Tax Return',
    directions:
      'Open My Tax Return in the left navigation. That is the working view of the return; a preparer still reviews it before anything is filed.',
    keywords: ['my return', 'tax return', 'return page', 'return view', '1040'],
  },
  {
    id: 'documents',
    href: '/documents',
    label: 'Documents',
    directions:
      'Open Documents in the left navigation. It lists each file, its scan status, and the extracted fields waiting for your confirmation. Please do not put an SSN, EIN, or account number in chat.',
    keywords: ['document', 'documents', 'upload', 'file', 'files', 'w-2', 'w2', '1099', 'receipt', 'scan'],
  },
  {
    id: 'tasks',
    href: '/tasks',
    label: 'Tasks',
    directions:
      'Open Tasks in the left navigation. It shows the deadlines and requests from your preparer; tick the box beside an item to mark it complete.',
    keywords: ['task', 'tasks', 'to-do', 'todo', 'checklist', 'outstanding item', 'what do you need'],
  },
  {
    id: 'messages',
    href: '/messages',
    label: 'Messages',
    directions:
      'Open Messages in the left navigation. It keeps your conversation with the TatoIQ team attached to your file. In this demo build the reply box is disabled.',
    keywords: ['message', 'messages', 'contact my preparer', 'talk to my preparer', 'send a note'],
  },
  {
    id: 'status',
    href: '/status',
    label: 'Tax Status',
    directions:
      'Open Tax Status in the left navigation. Filing status and refund status are shown separately, and only the IRS can confirm a refund date.',
    keywords: ['status', 'tax status', 'filing status', 'refund status', 'where is my return'],
  },
  {
    id: 'settings',
    href: '/settings',
    label: 'Account Settings',
    directions:
      'Open Account Settings in the left navigation to review the account details on file.',
    keywords: ['settings', 'account settings', 'my account', 'profile', 'email address'],
  },
  {
    id: 'contact',
    href: '/contact',
    label: 'Contact',
    directions:
      'Open the Contact page and fill out the form. Please leave out your SSN, EIN, bank account, and card numbers — those belong in a secure document channel.',
    keywords: ['contact', 'contact page', 'send a message', 'reach the team', 'book a call', 'consultation'],
  },
  {
    id: 'welcome',
    href: '/welcome',
    label: 'Welcome',
    directions:
      'Open the Welcome page for the short overview of what TatoIQ does and how the portal is meant to work.',
    keywords: ['welcome', 'about tatoiq', 'how does tatoiq work', 'what is tatoiq'],
  },
];

/**
 * Find the page a client means. We score whole keyword phrases rather than
 * loose substrings, so "where do I see my refund status" lands on Tax Status and
 * a stray "file" does not send every question to Documents.
 */
export function findGuideEntry(question: string): GuideEntry | null {
  const q = question.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;

  let best: { entry: GuideEntry; score: number } | null = null;
  for (const entry of SITE_GUIDE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const k = keyword.toLowerCase();
      if (!q.includes(k)) continue;
      score += k.includes(' ') ? 6 : 3;
      if (k.length >= 8) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }

  return best?.entry ?? null;
}

/** Link object returned to the UI. Never construct an href outside this map. */
export function guideLink(entry: GuideEntry): { label: string; href: string } {
  return { label: entry.label, href: entry.href };
}
