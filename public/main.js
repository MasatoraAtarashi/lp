// GA4 measurement ID. The page asks the Worker for the configured value so
// wrangler vars / .dev.vars stay the source of truth. A placeholder never loads gtag.js.
const GA_MEASUREMENT_ID_PLACEHOLDER = "G-XXXXXXXXXX";

const PLAN_FIELDS = ["dates", "pace", "interests", "diet", "party"];

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
  gtag("config", measurementId);

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

function planNote(form) {
  const lines = ["intent: free-plan"];
  for (const name of PLAN_FIELDS) {
    const value = fieldValue(form, name);
    if (value) lines.push(`${name}: ${value}`);
  }
  return lines.join("\n");
}

async function submitWaitlist(form, message, note, successText) {
  const email = fieldValue(form, "email");
  const submit = form.querySelector("[type='submit']");
  if (submit instanceof HTMLButtonElement) submit.disabled = true;
  message.textContent = "Sending…";
  message.className = "form-message";

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, note }),
    });

    if (res.status === 201) {
      message.textContent = successText;
      message.className = "form-message success";
      form.reset();
    } else if (res.status === 200) {
      message.textContent = "That email is already on the list. We'll be in touch.";
      message.className = "form-message success";
    } else {
      message.textContent = "Check the email address and try again.";
      message.className = "form-message error";
    }
  } catch {
    message.textContent = "Couldn't send that. Check your connection and try again.";
    message.className = "form-message error";
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
    void submitWaitlist(
      planForm,
      planMessage,
      planNote(planForm),
      "Request received. We'll email a half-day walking plan — no payment, no booking.",
    );
  });
}

if (premiumForm instanceof HTMLFormElement && premiumMessage) {
  premiumForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitWaitlist(
      premiumForm,
      premiumMessage,
      "intent: premium-waitlist",
      "You're on the premium waitlist. We'll write when coordination opens.",
    );
  });
}

initAnalytics();
