export function validateMovenpickLead(data) {
  const errors = {};

  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.firstName = "Please enter your first name.";
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.lastName = "Please enter your last name.";
  }

  if (!data.phone || !/^\+?[0-9\s()-]{7,20}$/.test(data.phone)) {
    errors.phone = "Please enter a valid phone number with country code.";
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (data.consent !== true) {
    errors.consent = "Please confirm that we may contact you.";
  }

  return {
    success: Object.keys(errors).length === 0,
    errors,
  };
}
