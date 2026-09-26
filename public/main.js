// GA4 measurement ID. The page asks the Worker for the configured value so
// wrangler vars / .dev.vars stay the source of truth. A placeholder never loads gtag.js.
const GA_MEASUREMENT_ID_PLACEHOLDER = "G-XXXXXXXXXX";

// Answers travel to D1 inside the single free-text `note` column, so no schema
// change is needed when the questionnaire changes — only this list.
const PLAN_FIELDS = ["dates", "duration", "party", "food", "quiet", "notes"];

// EN and JA share this script. All user-visible strings live in the HTML as
// data-msg-* on the <form>, so a translation never has to touch JavaScript.
const PAGE_LANG = document.documentElement.lang || "en";

function isRealMeasurementId(id) {
  return (
    typeof id === "string" && id !== GA_MEASUREMENT_ID_PLACEHOLDER && /^G-[A-Za-z0-9]+$/.test(id)
  );
}

function loadGoogleAnalytics(measurementId) {
  if (!isRealMeasurementId(measurementId)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  // Event names stay shared across locales; `language` separates EN from JA in reports.
  gtag("config", measurementId, { language: PAGE_LANG });

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
  document.head.appendChild(script);
}

async function initAnalytics() {
  let measurementId = GA_MEASUREMENT_ID_PLACEHOLDER;
  try {
    const res = await fetch("/api/public-config");
    if (res.ok) {
      const data = await res.json();
      if (typeof data.gaMeasurementId === "string") {
        measurementId = data.gaMeasurementId;
      }
    }
  } catch {
    // Signup still works if config is unreachable. Placeholder means gtag never loads.
  }
  loadGoogleAnalytics(measurementId);
}

function fieldValue(form, name) {
  const el = form.elements.namedItem(name);
  if (!el || !("value" in el)) return "";
  return String(el.value).trim();
}

function isChecked(form, name) {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement && el.checked;
}

function message(form, key) {
  return form.dataset["msg" + key] || "";
}

function planNote(form) {
  const lines = ["intent: free-plan", `lang: ${PAGE_LANG}`];
  for (const name of PLAN_FIELDS) {
    const value = fieldValue(form, name);
    if (value) lines.push(`${name}: ${value}`);
  }
  if (isChecked(form, "offerb")) lines.push("offer-b-interest: yes");
  return lines.join("\n");
}

async function submitWaitlist(form, messageEl, note) {
  const email = fieldValue(form, "email");
  const submit = form.querySelector("[type='submit']");
  if (submit instanceof HTMLButtonElement) submit.disabled = true;
  messageEl.textContent = message(form, "Sending");
  messageEl.className = "form-message";

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, note }),
    });

    if (res.status === 201) {
      messageEl.textContent = message(form, "Created");
      messageEl.className = "form-message success";
      form.reset();
    } else if (res.status === 200) {
      messageEl.textContent = message(form, "Duplicate");
      messageEl.className = "form-message success";
    } else {
      messageEl.textContent = message(form, "Invalid");
      messageEl.className = "form-message error";
    }
  } catch {
    messageEl.textContent = message(form, "Network");
    messageEl.className = "form-message error";
  } finally {
    if (submit instanceof HTMLButtonElement) submit.disabled = false;
  }
}

const planForm = document.getElementById("plan-form");
const planMessage = document.getElementById("form-message");
const premiumForm = document.getElementById("premium-form");
const premiumMessage = document.getElementById("premium-message");

if (planForm instanceof HTMLFormElement && planMessage) {
  planForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitWaitlist(planForm, planMessage, planNote(planForm));
  });
}

if (premiumForm instanceof HTMLFormElement && premiumMessage) {
  premiumForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitWaitlist(
      premiumForm,
      premiumMessage,
      `intent: offer-b-waitlist\nlang: ${PAGE_LANG}`,
    );
  });
}

initAnalytics();
