// path: lib/validation.js

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8)
    errors.push("Password must be at least 8 characters.");
  if (!/[A-Z]/.test(password))
    errors.push("Password must contain an uppercase letter.");
  if (!/[a-z]/.test(password))
    errors.push("Password must contain a lowercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Password must contain a number.");
  return { valid: errors.length === 0, errors };
}

export function validateUserPayload(body, { isUpdate = false } = {}) {
  const errors = [];
  if (!isUpdate || body.email !== undefined) {
    if (!isValidEmail(body.email)) errors.push("A valid email is required.");
  }
  if (!isUpdate || body.full_name !== undefined) {
    if (!body.full_name || body.full_name.trim().length < 2) {
      errors.push("Full name must be at least 2 characters.");
    }
  }
  if (!isUpdate) {
    if (!body.role_id) errors.push("A role must be assigned.");
    const pw = validatePassword(body.password);
    if (!pw.valid) errors.push(...pw.errors);
  }
  if (
    body.employee_id !== undefined &&
    body.employee_id !== null &&
    body.employee_id.trim() === ""
  ) {
    errors.push("Employee ID cannot be blank if provided.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateRolePayload(body) {
  const errors = [];
  if (!body.name || !/^[a-z][a-z0-9_]{2,49}$/.test(body.name)) {
    errors.push(
      "Role name must be lowercase, start with a letter, and use only letters/numbers/underscore (3-50 chars).",
    );
  }
  return { valid: errors.length === 0, errors };
}

export function validatePathPayload(body) {
  const errors = [];
  if (!body.path || !body.path.startsWith("/")) {
    errors.push('Path must start with "/".');
  }
  if (!body.label || body.label.trim().length < 2) {
    errors.push("Label is required.");
  }
  return { valid: errors.length === 0, errors };
}

// ---- Item Master Configuration Validators ----

export function validateCategoryPayload(body, parentCategory) {
  const errors = [];
  if (!body.name || body.name.trim().length < 2)
    errors.push("Name is required.");
  if (!body.code || body.code.trim().length < 2)
    errors.push("Code is required.");
  if (!body.company_id) errors.push("Company is required.");
  if (!["segment", "category", "subcategory"].includes(body.level)) {
    errors.push("Level must be segment, category, or subcategory.");
  }
  if (body.level === "segment" && body.parent_id) {
    errors.push("A segment cannot have a parent.");
  }
  if (body.level === "category") {
    if (!body.parent_id) errors.push("A category must have a parent segment.");
    else if (parentCategory && parentCategory.level !== "segment")
      errors.push("A category's parent must be a segment.");
  }
  if (body.level === "subcategory") {
    if (!body.parent_id)
      errors.push("A sub-category must have a parent category.");
    else if (parentCategory && parentCategory.level !== "category")
      errors.push("A sub-category's parent must be a category.");
  }
  return { valid: errors.length === 0, errors };
}

export function validateUomClassPayload(body) {
  const errors = [];
  if (!body.name || body.name.trim().length < 2)
    errors.push("Class name is required.");
  return { valid: errors.length === 0, errors };
}

export function validateUomPayload(body) {
  const errors = [];
  if (!body.code || body.code.trim().length < 1)
    errors.push("Unit code is required.");
  if (!body.name || body.name.trim().length < 1)
    errors.push("Unit name is required.");
  if (!body.class_id) errors.push("A unit class is required.");
  return { valid: errors.length === 0, errors };
}

export function validateTaxClassPayload(body) {
  const errors = [];
  if (!body.name || body.name.trim().length < 2)
    errors.push("Name is required.");
  if (!body.code || body.code.trim().length < 1)
    errors.push("Code is required.");
  if (!body.company_id) errors.push("Company is required.");
  if (
    body.is_taxable &&
    (body.rate === undefined ||
      body.rate === null ||
      isNaN(Number(body.rate)) ||
      Number(body.rate) < 0)
  ) {
    errors.push("A valid, non-negative rate is required for taxable classes.");
  }
  return { valid: errors.length === 0, errors };
}

// path: lib/validation.js (add these to the end of the existing file — keep everything already there)

export function validateItemPayload(body, { isUpdate = false } = {}) {
  const errors = [];
  const validTypes = [
    "finished_product",
    "service",
    "semi_processed",
    "ingredient",
    "packaging",
    "asset",
    "expense",
  ];

  if (!isUpdate || body.name !== undefined) {
    if (!body.name || body.name.trim().length < 2)
      errors.push("Item name is required.");
  }
  if (!isUpdate || body.sku !== undefined) {
    if (!body.sku || body.sku.trim().length < 2)
      errors.push("SKU is required.");
  }
  if (!isUpdate) {
    if (!body.company_id) errors.push("Company is required.");
    if (!validTypes.includes(body.item_type))
      errors.push("A valid item type is required.");
    if (!body.base_uom_id) errors.push("A base unit of measure is required.");
  }
  if (body.default_cost !== undefined && body.default_cost !== null) {
    if (isNaN(Number(body.default_cost)) || Number(body.default_cost) < 0) {
      errors.push("Default cost must be a non-negative number.");
    }
  }
  if (
    body.track_expiry &&
    (!body.shelf_life_days || Number(body.shelf_life_days) <= 0)
  ) {
    errors.push(
      "Shelf life (in days) is required when expiry tracking is enabled.",
    );
  }
  return { valid: errors.length === 0, errors };
}
