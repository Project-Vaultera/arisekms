// Client-side prechecks for the membership flow. Mirrors the server submit
// rules (the server remains the real enforcement); used to gate wizard steps
// and to block letters in numeric fields at keystroke.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function filled(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

export function stripToPhone(v) {
  return String(v ?? '').replace(/[^+()\-\s\d]/g, '');
}

export function stripToDigits(v) {
  return String(v ?? '').replace(/\D/g, '');
}

export function isValidPhone(v) {
  if (!filled(v)) return false;
  if (/[^+()\-\s\d]/.test(String(v))) return false;
  return stripToDigits(v).length >= 7;
}

export function isValidEmail(v) {
  return filled(v) && EMAIL_RE.test(String(v).trim());
}

export function normalizeWebsite(v) {
  const s = String(v ?? '').trim();
  if (!s) return s;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function isValidWebsite(v) {
  if (!filled(v)) return false;
  try {
    const u = new URL(normalizeWebsite(v));
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function isValidZip(v) {
  return filled(v) && /^[A-Za-z0-9][A-Za-z0-9\s-]*$/.test(String(v).trim());
}

export function isValidStaffCount(v) {
  if (v === '' || v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1;
}

function req(errors, form, key, label) {
  if (!filled(form[key])) errors[key] = `${label} is required`;
}

// Client mirror of the server submit rules, per wizard tab. Returns a map of
// field key -> message (empty = step may proceed). `_section` keys flag
// non-field problems (missing primary contact, missing proof).
export function validateWizardTab(tabId, form, { proofs = [], primary = null, contacts = [] } = {}) {
  const errors = {};
  switch (tabId) {
    case 'company': {
      req(errors, form, 'legalRepName', 'Legal representative name');
      req(errors, form, 'legalRepTitle', 'Legal representative title');
      req(errors, form, 'applicantCountry', 'Country of applicant');
      req(errors, form, 'registeredCountry', 'Country of registration');
      req(errors, form, 'sector', 'Company sector');
      req(errors, form, 'street', 'Street');
      if (!isValidZip(form.zip)) errors.zip = filled(form.zip) ? 'Post / ZIP code looks invalid' : 'Post / ZIP code is required';
      req(errors, form, 'website', 'Website');
      if (filled(form.website) && !isValidWebsite(form.website)) errors.website = 'Website URL looks invalid';
      if (filled(form.phone) && !isValidPhone(form.phone)) errors.phone = 'Phone number looks invalid';
      if (filled(form.fax) && !isValidPhone(form.fax)) errors.fax = 'Fax number looks invalid';
      if (!isValidStaffCount(form.staffCount)) errors.staffCount = 'Staff count must be a whole number of 1 or more';
      req(errors, form, 'annualRevenue', 'Annual revenue');
      if (proofs.length === 0 && !filled(form.noAttachmentExplanation)) {
        errors._docs = 'Attach registration proof or explain why none was attached';
      }
      break;
    }
    case 'primary': {
      if (!primary) {
        errors._primary = 'Save a primary contact before continuing';
      } else {
        if (!filled(primary.firstName)) errors.firstName = 'First name is required';
        if (!filled(primary.lastName)) errors.lastName = 'Last name is required';
        if (!isValidEmail(primary.email)) errors.email = 'A valid email is required';
        if (!isValidPhone(primary.phone)) errors.phone = 'A valid phone number is required';
        if (!primary.sameAsRegistered) {
          if (!filled(primary.country)) errors.country = 'Country is required';
          if (!filled(primary.city)) errors.city = 'City is required';
          if (!filled(primary.street)) errors.street = 'Street is required';
          if (!isValidZip(primary.zip)) errors.zip = 'Post / ZIP code is required';
        }
      }
      break;
    }
    case 'additional': {
      // Skippable when empty, but a listed contact must be valid to earn the check.
      if (contacts.length === 0) {
        errors._additional = 'No additional contacts yet';
      }
      for (const c of contacts) {
        if (!filled(c.firstName) || !filled(c.lastName)) {
          errors[`contact-${c.id}-name`] = 'An additional contact is missing a name';
          break;
        }
        if (!isValidEmail(c.email)) {
          errors[`contact-${c.id}-email`] = 'An additional contact has an invalid email';
          break;
        }
        if (!filled(c.contactType)) {
          errors[`contact-${c.id}-type`] = 'An additional contact is missing its type';
          break;
        }
      }
      break;
    }
    case 'affiliations': {
      if (form.unGlobalCompact !== true && form.unGlobalCompact !== false) {
        errors.unGlobalCompact = 'Please answer the UN Global Impact question';
      }
      if (form.otherUnAgency && !filled(form.whichAgency)) {
        errors.whichAgency = 'Please name the agency';
      }
      break;
    }
    case 'other': {
      req(errors, form, 'businessOverview', 'Business overview');
      req(errors, form, 'geographicFocus', 'Geographic focus');
      break;
    }
    default:
      break;
  }
  return errors;
}

export function firstErrorMessage(errors) {
  const vals = Object.values(errors);
  return vals.length > 0 ? String(vals[0]) : '';
}
