import { ShowcaseSubmission } from '../types';

/**
 * Service handler for Hackers Occupied Pune Project Showcase Submissions.
 * Initiative by AIDN × Genesis.
 *
 * NOTE: Currently configured with local state persistence.
 * When connecting a real backend (e.g. Supabase) in the future, replace the
 * localStorage read/write below with the standard insert call, and move the
 * spam/rate-limit checks server-side — client-side checks can always be
 * bypassed and only exist here to keep the local demo data usable.
 */

const STORAGE_KEY = 'aidn_showcase_submissions';
const MAX_STORED_SUBMISSIONS = 200; // hard cap so local storage can't grow without bound
const RESUBMIT_COOLDOWN_MS = 15_000; // basic duplicate-submit / spam-bot guard

const FIELD_LIMITS = {
  teamName: 100,
  teamRepresentative: 100,
  contactEmail: 254, // RFC 5321 max length
  organization: 150,
  teamMembers: 500,
  socialHandles: 300,
  projectName: 100,
  shortDescription: 200,
  problemStatement: 1000,
  solutionApproach: 1500,
  techStack: 300,
  repositoryUrl: 2048,
  prototypeUrl: 2048,
  demoVideoUrl: 2048,
  documentationUrl: 2048,
} as const;

export { FIELD_LIMITS };

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/**
 * Trims and length-clamps every text field before it is persisted. Even
 * though the form enforces maxLength client-side, that's only a UI
 * affordance — a request can always be crafted by hand, so the service
 * layer re-enforces the same limits before anything is written to storage.
 */
function sanitizeSubmission(submission: ShowcaseSubmission): ShowcaseSubmission {
  return {
    ...submission,
    teamName: clamp(submission.teamName, FIELD_LIMITS.teamName),
    teamRepresentative: clamp(submission.teamRepresentative, FIELD_LIMITS.teamRepresentative),
    contactEmail: clamp(submission.contactEmail, FIELD_LIMITS.contactEmail).toLowerCase(),
    organization: clamp(submission.organization, FIELD_LIMITS.organization),
    teamMembers: clamp(submission.teamMembers, FIELD_LIMITS.teamMembers),
    socialHandles: submission.socialHandles ? clamp(submission.socialHandles, FIELD_LIMITS.socialHandles) : submission.socialHandles,
    projectName: clamp(submission.projectName, FIELD_LIMITS.projectName),
    shortDescription: clamp(submission.shortDescription, FIELD_LIMITS.shortDescription),
    problemStatement: clamp(submission.problemStatement, FIELD_LIMITS.problemStatement),
    solutionApproach: clamp(submission.solutionApproach, FIELD_LIMITS.solutionApproach),
    techStack: clamp(submission.techStack, FIELD_LIMITS.techStack),
    repositoryUrl: submission.repositoryUrl ? clamp(submission.repositoryUrl, FIELD_LIMITS.repositoryUrl) : submission.repositoryUrl,
    prototypeUrl: submission.prototypeUrl ? clamp(submission.prototypeUrl, FIELD_LIMITS.prototypeUrl) : submission.prototypeUrl,
    demoVideoUrl: submission.demoVideoUrl ? clamp(submission.demoVideoUrl, FIELD_LIMITS.demoVideoUrl) : submission.demoVideoUrl,
    documentationUrl: submission.documentationUrl ? clamp(submission.documentationUrl, FIELD_LIMITS.documentationUrl) : submission.documentationUrl,
  };
}

function readStoredSubmissions(): ShowcaseSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted or tampered local data shouldn't crash the app.
    return [];
  }
}

function lastSubmissionTimestamp(email: string): number | null {
  try {
    const raw = sessionStorage.getItem('aidn_showcase_last_submit');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email: string; ts: number };
    return parsed.email === email.trim().toLowerCase() ? parsed.ts : null;
  } catch {
    return null;
  }
}

function recordSubmissionTimestamp(email: string): void {
  try {
    sessionStorage.setItem(
      'aidn_showcase_last_submit',
      JSON.stringify({ email: email.trim().toLowerCase(), ts: Date.now() })
    );
  } catch {
    // Ignore storage errors; this is a best-effort guard, not a hard requirement.
  }
}

export async function submitShowcaseProject(
  submission: ShowcaseSubmission
): Promise<{ success: boolean; data?: ShowcaseSubmission; error?: string }> {
  // Lightweight guard against accidental rapid-fire duplicate submissions
  // (e.g. a double network retry or a scripted bot). This is a UX safety
  // net only — real abuse prevention belongs on a server.
  const lastTs = lastSubmissionTimestamp(submission.contactEmail);
  if (lastTs && Date.now() - lastTs < RESUBMIT_COOLDOWN_MS) {
    return {
      success: false,
      error: 'You already submitted a project moments ago. Please wait a few seconds and try again.',
    };
  }

  try {
    // Artificial latency for authentic submission feedback
    await new Promise((resolve) => setTimeout(resolve, 800));

    const sanitized = sanitizeSubmission(submission);
    const submissionWithMetadata: ShowcaseSubmission = {
      ...sanitized,
      id: `submission-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = readStoredSubmissions();
      existing.unshift(submissionWithMetadata);
      // Cap how much we keep locally so a burst of submissions (or one
      // very determined user) can't exhaust the browser's storage quota.
      const trimmed = existing.slice(0, MAX_STORED_SUBMISSIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (storageErr) {
      // A failed write here means the submission was never actually saved,
      // so we must not report success back to the user even though the
      // rest of the flow completed — otherwise they'd believe their
      // project was archived when it wasn't.
      const isQuotaError =
        storageErr instanceof DOMException &&
        (storageErr.name === 'QuotaExceededError' || storageErr.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      return {
        success: false,
        error: isQuotaError
          ? 'Your browser storage is full. Please clear some space and try again.'
          : 'Could not save your submission locally. Please try again.',
      };
    }

    recordSubmissionTimestamp(submission.contactEmail);

    return {
      success: true,
      data: submissionWithMetadata,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred while submitting.';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Validates a URL string format. Only http/https are accepted so a
 * malicious value (e.g. a javascript: URI) can never end up rendered as a
 * clickable link elsewhere in the showcase.
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true; // empty is handled separately
  if (url.trim().length > 2048) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates an email address format using a practical (not fully
 * RFC-5322-compliant, but stricter than a bare "has an @" check) pattern.
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}
