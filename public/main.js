// GA4 measurement ID. The page asks the Worker for the configured value so
// wrangler vars / .dev.vars stay the source of truth. A placeholder never loads gtag.js.
const GA_MEASUREMENT_ID_PLACEHOLDER = "G-XXXXXXXXXX";

const form = document.getElementById("waitlist");
const input = document.getElementById("email");
const message = document.getElementById("form-message");

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = input.value.trim();

  message.textContent = "Joining...";
  message.className = "form-message";

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.status === 201) {
      message.textContent = "You're on the list. We'll email you when the first walks open.";
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
    message.textContent = "Couldn't join the list. Check your connection and try again.";
    message.className = "form-message error";
  }
});

initAnalytics();
