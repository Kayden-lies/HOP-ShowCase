import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ShowcaseSubmission, ShowcaseFormErrors } from '../../types';
import { submitShowcaseProject, isValidUrl, isValidEmail, FIELD_LIMITS } from '../../utils/showcaseService';
import logoA from '../../assets/Logo_A.png';

const INITIAL_FORM_STATE: ShowcaseSubmission = {
  teamName: '',
  teamRepresentative: '',
  contactEmail: '',
  organization: '',
  teamMembers: '',
  socialHandles: '',
  projectName: '',
  shortDescription: '',
  problemStatement: '',
  solutionApproach: '',
  techStack: '',
  repositoryUrl: '',
  prototypeUrl: '',
  demoVideoUrl: '',
  documentationUrl: '',
  consentGiven: false,
};

// Fields required for a valid submission — used to drive the progress
// indicator so it always stays in sync with the validate() rules below.
const REQUIRED_FIELDS: (keyof ShowcaseSubmission)[] = [
  'teamName',
  'organization',
  'teamRepresentative',
  'contactEmail',
  'teamMembers',
  'projectName',
  'shortDescription',
  'problemStatement',
  'solutionApproach',
  'techStack',
  'consentGiven',
];

export default function ShowcaseForm() {
  const [formData, setFormData] = useState<ShowcaseSubmission>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<ShowcaseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<ShowcaseSubmission | null>(null);
  // Honeypot: invisible to real visitors, but scripted bots that fill in
  // every field on a page will populate it. Never rendered as a labelled
  // field and never sent anywhere — if it's non-empty we just quietly
  // stop, without saving anything or tipping the bot off.
  const [honeypot, setHoneypot] = useState('');

  const completedRequiredCount = REQUIRED_FIELDS.filter((field) => {
    const value = formData[field];
    return typeof value === 'boolean' ? value : Boolean(String(value ?? '').trim());
  }).length;
  const progressPercent = Math.round((completedRequiredCount / REQUIRED_FIELDS.length) * 100);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof ShowcaseSubmission]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof ShowcaseSubmission];
        return next;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
    if (errors[name as keyof ShowcaseSubmission]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof ShowcaseSubmission];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: ShowcaseFormErrors = {};

    // Team Validations
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    }
    if (!formData.organization.trim()) {
      newErrors.organization = 'College or Organization is required';
    }
    if (!formData.teamRepresentative.trim()) {
      newErrors.teamRepresentative = 'Team representative / lead name is required';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!isValidEmail(formData.contactEmail)) {
      newErrors.contactEmail = 'Please provide a valid email address';
    }
    if (!formData.teamMembers.trim()) {
      newErrors.teamMembers = 'Please list team members';
    }

    // Project Validations
    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = 'Short project summary is required';
    } else if (formData.shortDescription.trim().length < 15) {
      newErrors.shortDescription = 'Please provide at least 15 characters';
    }
    if (!formData.problemStatement.trim()) {
      newErrors.problemStatement = 'Problem statement is required';
    }
    if (!formData.solutionApproach.trim()) {
      newErrors.solutionApproach = 'Solution & technical approach is required';
    }
    if (!formData.techStack.trim()) {
      newErrors.techStack = 'Technology stack is required';
    }

    // URL Validations
    if (formData.repositoryUrl && !isValidUrl(formData.repositoryUrl)) {
      newErrors.repositoryUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    if (formData.prototypeUrl && !isValidUrl(formData.prototypeUrl)) {
      newErrors.prototypeUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    if (formData.demoVideoUrl && !isValidUrl(formData.demoVideoUrl)) {
      newErrors.demoVideoUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }
    if (formData.documentationUrl && !isValidUrl(formData.documentationUrl)) {
      newErrors.documentationUrl = 'Please enter a valid URL (starting with http:// or https://)';
    }

    // Consent Checkbox
    if (!formData.consentGiven) {
      newErrors.consentGiven = 'You must grant permission to feature your project before submitting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Bot trap: a human never sees or fills this field, so any value here
    // means the request didn't come from the real form. Stop silently.
    if (honeypot.trim()) {
      return;
    }

    if (!validate()) {
      const firstErrorElement = document.querySelector('[data-has-error="true"]');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitShowcaseProject(formData);
      if (result.success && result.data) {
        setSubmittedData(result.data);
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrors((prev) => ({
          ...prev,
          form: result.error || 'Failed to submit project. Please try again.',
        }));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        form: 'An unexpected connection error occurred. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setFormData(INITIAL_FORM_STATE);
    setErrors({});
    setIsSuccess(false);
    setSubmittedData(null);
    setHoneypot('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-20">
      <AnimatePresence mode="wait">
        {isSuccess && submittedData ? (
          /* SUCCESS STATE */
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 sm:p-10 shadow-xl"
          >
            <div className="max-w-xl mx-auto text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <img
                  src={logoA}
                  alt="AIDN Logo"
                  className="h-[85px] sm:h-[94px] w-auto object-contain"
                />
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3 tracking-tight">
                Project Submitted Successfully
              </h2>

              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed mb-6">
                Thank you for submitting your project from Hackers Occupied Pune. The AIDN × Genesis team will review your submission and feature selected projects across our official platforms and community channels.
              </p>

              <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-5 text-left mb-6 space-y-3.5">
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Project Name</span>
                    <span className="text-base font-semibold text-zinc-100">{submittedData.projectName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Team</span>
                    <span className="text-sm font-medium text-zinc-200">{submittedData.teamName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-400 font-medium block">Lead Representative:</span>
                    <span className="text-zinc-200">{submittedData.teamRepresentative}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium block">Contact Email:</span>
                    <span className="text-zinc-200 font-mono">{submittedData.contactEmail}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium block">College / Organization:</span>
                    <span className="text-zinc-200">{submittedData.organization}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium block">Tech Stack:</span>
                    <span className="text-zinc-200 truncate block">{submittedData.techStack}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors border border-zinc-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Submit Another Project
                </button>

                <a
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Return to AIDN Home
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </motion.div>
        ) : (
          /* SUBMISSION FORM */
          <motion.div
            key="submission-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xl overflow-hidden"
          >
            {/* Form Top Bar */}
            <div className="border-b border-zinc-800 px-6 sm:px-8 py-4 sm:py-5 bg-zinc-950/60">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                    Official Submission Form
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Hackers Occupied Pune • AIDN × Genesis Archive
                  </p>
                </div>
                <span className="hidden sm:inline-block text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded shrink-0">
                  * Required fields
                </span>
              </div>

              {/* Completion Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-zinc-500">
                    Required fields completed
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {completedRequiredCount}/{REQUIRED_FIELDS.length}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-400"
                    initial={false}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-8">
              {/* Honeypot field — hidden from real users, left for bots.
                  Do not add a visible label or move this out of the DOM;
                  its invisibility is what makes it work. */}
              <div
                aria-hidden="true"
                className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
                style={{ clip: 'rect(0,0,0,0)' }}
              >
                <label htmlFor="website">Leave this field blank</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Form Global Error */}
              {errors.form && (
                <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-xs uppercase tracking-wider">Submission Error</p>
                    <p className="text-xs text-red-300/90 mt-0.5">{errors.form}</p>
                  </div>
                </div>
              )}

              {/* SECTION 1: TEAM INFORMATION */}
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold font-mono text-zinc-300 uppercase tracking-wider">
                    01 / Team Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Team Name */}
                  <div className="space-y-1.5" data-has-error={!!errors.teamName}>
                    <label htmlFor="teamName" className="block text-xs font-medium text-zinc-300">
                      Team Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="teamName"
                      name="teamName"
                      type="text"
                      value={formData.teamName}
                      onChange={handleInputChange}
                      placeholder="e.g. Pune Dev Squad"
                    maxLength={FIELD_LIMITS.teamName}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.teamName ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.teamName && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.teamName}
                      </p>
                    )}
                  </div>

                  {/* College / Organization */}
                  <div className="space-y-1.5" data-has-error={!!errors.organization}>
                    <label htmlFor="organization" className="block text-xs font-medium text-zinc-300">
                      College / Organization <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="organization"
                      name="organization"
                      type="text"
                      value={formData.organization}
                      onChange={handleInputChange}
                      placeholder="e.g. COEP Tech University / Independent"
                    maxLength={FIELD_LIMITS.organization}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.organization ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.organization && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.organization}
                      </p>
                    )}
                  </div>

                  {/* Team Representative / Lead */}
                  <div className="space-y-1.5" data-has-error={!!errors.teamRepresentative}>
                    <label htmlFor="teamRepresentative" className="block text-xs font-medium text-zinc-300">
                      Team Representative / Lead Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="teamRepresentative"
                      name="teamRepresentative"
                      type="text"
                      value={formData.teamRepresentative}
                      onChange={handleInputChange}
                      placeholder="e.g. Aarav Sharma"
                    maxLength={FIELD_LIMITS.teamRepresentative}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.teamRepresentative ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.teamRepresentative && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.teamRepresentative}
                      </p>
                    )}
                  </div>

                  {/* Contact Email */}
                  <div className="space-y-1.5" data-has-error={!!errors.contactEmail}>
                    <label htmlFor="contactEmail" className="block text-xs font-medium text-zinc-300">
                      Contact Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="e.g. team.lead@example.com"
                    maxLength={FIELD_LIMITS.contactEmail}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.contactEmail ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.contactEmail && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.contactEmail}
                      </p>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-1.5" data-has-error={!!errors.teamMembers}>
                  <label htmlFor="teamMembers" className="block text-xs font-medium text-zinc-300">
                    Team Members <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="teamMembers"
                    name="teamMembers"
                    type="text"
                    value={formData.teamMembers}
                    onChange={handleInputChange}
                    placeholder="e.g. Aarav Sharma, Priya Patel, Rohan Deshmukh"
                    maxLength={FIELD_LIMITS.teamMembers}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.teamMembers ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                  />
                  <p className="text-[11px] text-zinc-500">
                    List all team member names separated by commas.
                  </p>
                  {errors.teamMembers && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.teamMembers}
                    </p>
                  )}
                </div>

                {/* Social Handles (Optional) */}
                <div className="space-y-1.5">
                  <label htmlFor="socialHandles" className="block text-xs font-medium text-zinc-300">
                    Social Handles <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="socialHandles"
                    name="socialHandles"
                    type="text"
                    value={formData.socialHandles}
                    onChange={handleInputChange}
                    placeholder="e.g. GitHub: @aarav, LinkedIn: in/aarav, X: @aarav_dev"
                    maxLength={FIELD_LIMITS.socialHandles}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-zinc-500">
                    GitHub, LinkedIn, or X/Twitter handles for attribution and spotlighting.
                  </p>
                </div>
              </div>

              {/* SECTION 2: PROJECT DETAILS */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold font-mono text-zinc-300 uppercase tracking-wider">
                    02 / Project Details
                  </h3>
                </div>

                {/* Project Name */}
                <div className="space-y-1.5" data-has-error={!!errors.projectName}>
                  <label htmlFor="projectName" className="block text-xs font-medium text-zinc-300">
                    Project Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="projectName"
                    name="projectName"
                    type="text"
                    value={formData.projectName}
                    onChange={handleInputChange}
                    placeholder="e.g. NeuroShield"
                    maxLength={FIELD_LIMITS.projectName}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.projectName ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                  />
                  {errors.projectName && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.projectName}
                    </p>
                  )}
                </div>

                {/* Short Description */}
                <div className="space-y-1.5" data-has-error={!!errors.shortDescription}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="shortDescription" className="block text-xs font-medium text-zinc-300">
                      Short Project Summary <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formData.shortDescription.length}/{FIELD_LIMITS.shortDescription}
                    </span>
                  </div>
                  <textarea
                    id="shortDescription"
                    name="shortDescription"
                    rows={2}
                    value={formData.shortDescription}
                    onChange={handleInputChange}
                    placeholder="A concise 1-2 sentence summary of what the project does and its core value."
                    maxLength={FIELD_LIMITS.shortDescription}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.shortDescription ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors leading-relaxed`}
                  />
                  {errors.shortDescription && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.shortDescription}
                    </p>
                  )}
                </div>

                {/* Problem Statement */}
                <div className="space-y-1.5" data-has-error={!!errors.problemStatement}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="problemStatement" className="block text-xs font-medium text-zinc-300">
                      Problem Statement <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formData.problemStatement.length}/{FIELD_LIMITS.problemStatement}
                    </span>
                  </div>
                  <textarea
                    id="problemStatement"
                    name="problemStatement"
                    rows={3}
                    value={formData.problemStatement}
                    onChange={handleInputChange}
                    placeholder="What specific challenge or real-world problem does your project address?"
                    maxLength={FIELD_LIMITS.problemStatement}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.problemStatement ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors leading-relaxed`}
                  />
                  {errors.problemStatement && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.problemStatement}
                    </p>
                  )}
                </div>

                {/* Solution & Approach */}
                <div className="space-y-1.5" data-has-error={!!errors.solutionApproach}>
                  <div className="flex items-center justify-between">
                    <label htmlFor="solutionApproach" className="block text-xs font-medium text-zinc-300">
                      Solution & Technical Approach <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formData.solutionApproach.length}/{FIELD_LIMITS.solutionApproach}
                    </span>
                  </div>
                  <textarea
                    id="solutionApproach"
                    name="solutionApproach"
                    rows={3}
                    value={formData.solutionApproach}
                    onChange={handleInputChange}
                    placeholder="Describe how your project solves this problem. Outline the architecture, core workflows, and technical implementation."
                    maxLength={FIELD_LIMITS.solutionApproach}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.solutionApproach ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors leading-relaxed`}
                  />
                  {errors.solutionApproach && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.solutionApproach}
                    </p>
                  )}
                </div>

                {/* Tech Stack */}
                <div className="space-y-1.5" data-has-error={!!errors.techStack}>
                  <label htmlFor="techStack" className="block text-xs font-medium text-zinc-300">
                    Technology Stack <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="techStack"
                    name="techStack"
                    type="text"
                    value={formData.techStack}
                    onChange={handleInputChange}
                    placeholder="e.g. React, TypeScript, Python, FastAPI, PostgreSQL, Tailwind CSS"
                    maxLength={FIELD_LIMITS.techStack}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                      errors.techStack ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                    } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                  />
                  <p className="text-[11px] text-zinc-500">
                    Languages, frameworks, APIs, databases, or developer tools utilized.
                  </p>
                  {errors.techStack && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.techStack}
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 3: PROJECT LINKS & MEDIA */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold font-mono text-zinc-300 uppercase tracking-wider">
                    03 / Project Links & Media
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GitHub / Repository */}
                  <div className="space-y-1.5" data-has-error={!!errors.repositoryUrl}>
                    <label htmlFor="repositoryUrl" className="block text-xs font-medium text-zinc-300">
                      GitHub / Code Repository <span className="text-zinc-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="repositoryUrl"
                      name="repositoryUrl"
                      type="url"
                      value={formData.repositoryUrl}
                      onChange={handleInputChange}
                      placeholder="https://github.com/org/repo"
                    maxLength={FIELD_LIMITS.repositoryUrl}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.repositoryUrl ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.repositoryUrl && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.repositoryUrl}
                      </p>
                    )}
                  </div>

                  {/* Prototype / Live Project */}
                  <div className="space-y-1.5" data-has-error={!!errors.prototypeUrl}>
                    <label htmlFor="prototypeUrl" className="block text-xs font-medium text-zinc-300">
                      Live Prototype / Demo URL <span className="text-zinc-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="prototypeUrl"
                      name="prototypeUrl"
                      type="url"
                      value={formData.prototypeUrl}
                      onChange={handleInputChange}
                      placeholder="https://myproject.example.com"
                    maxLength={FIELD_LIMITS.prototypeUrl}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.prototypeUrl ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.prototypeUrl && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.prototypeUrl}
                      </p>
                    )}
                  </div>

                  {/* Demo Video */}
                  <div className="space-y-1.5" data-has-error={!!errors.demoVideoUrl}>
                    <label htmlFor="demoVideoUrl" className="block text-xs font-medium text-zinc-300">
                      Demo / Walkthrough Video <span className="text-zinc-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="demoVideoUrl"
                      name="demoVideoUrl"
                      type="url"
                      value={formData.demoVideoUrl}
                      onChange={handleInputChange}
                      placeholder="https://youtube.com/watch?v=... or Loom"
                    maxLength={FIELD_LIMITS.demoVideoUrl}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.demoVideoUrl ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.demoVideoUrl && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.demoVideoUrl}
                      </p>
                    )}
                  </div>

                  {/* Documentation / Presentation */}
                  <div className="space-y-1.5" data-has-error={!!errors.documentationUrl}>
                    <label htmlFor="documentationUrl" className="block text-xs font-medium text-zinc-300">
                      Presentation / Documentation <span className="text-zinc-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="documentationUrl"
                      name="documentationUrl"
                      type="url"
                      value={formData.documentationUrl}
                      onChange={handleInputChange}
                      placeholder="https://docs.google.com/presentation/... or Notion"
                    maxLength={FIELD_LIMITS.documentationUrl}
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 border ${
                        errors.documentationUrl ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-zinc-800 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500'
                      } text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none transition-colors`}
                    />
                    {errors.documentationUrl && (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors.documentationUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: PERMISSION & CONSENT */}
              <div className="pt-2 border-t border-zinc-800">
                <div 
                  className={`p-4 sm:p-5 rounded-lg bg-zinc-950 border ${
                    errors.consentGiven ? 'border-red-500/80 bg-red-950/10' : 'border-zinc-800'
                  } transition-colors`}
                  data-has-error={!!errors.consentGiven}
                >
                  <label htmlFor="consentGiven" className="flex items-start gap-3.5 cursor-pointer">
                    <input
                      id="consentGiven"
                      name="consentGiven"
                      type="checkbox"
                      checked={formData.consentGiven}
                      onChange={handleCheckboxChange}
                      className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-zinc-500 shrink-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <span className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed block">
                        I grant AIDN and Genesis permission to feature, share, and archive this project, including screenshots, demo links, media, and submitted details, on official platforms and community channels.
                        <span className="text-red-400 ml-1">*</span>
                      </span>
                    </div>
                  </label>

                  {errors.consentGiven && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-2 pl-7.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.consentGiven}
                    </p>
                  )}
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-zinc-500 text-center sm:text-left order-2 sm:order-1">
                  Submissions are reviewed by the AIDN × Genesis team.
                </p>

                <button
                  type="submit"
                  id="btn-submit-project"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto min-w-[200px] order-1 sm:order-2 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white active:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-900 font-semibold text-sm transition-colors cursor-pointer shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Project</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
