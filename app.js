"use strict";

let currentWeightLbs = null;
let currentUnit = "lbs";
let catName = "";
let currentResults = null;
const FORMULAS = {
  lbToKg: 0.45359237,
  medications: {
    metronidazole: { mgPerKg: 10, concentrationMgPerML: 50 },
    pyrantel: { mlPerLbs: 0.1, concentrationLabel: "50mg / 1ml" },
    albon: { mgPerKg: 55, concentrationMgPerML: 10, concentrationLabel: "50mg / 5ml" },
    panacur: { mgPerKg: 50, concentrationMgPerML: 100 }
  }
};
const IOS_INSTALL_DISMISSED_KEY = "iosInstallHintDismissed";
const IOS_INSTALL_LAST_SHOWN_KEY = "iosInstallHintLastShownAt";
const IOS_INSTALL_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 30;
const MEDICATION_KEYS = ["metronidazole", "pyrantel", "albon", "panacur"];
let medicationSelections = Object.fromEntries(MEDICATION_KEYS.map((key) => [key, false]));

function formatML(value) {
  return value.toFixed(2);
}

function validateWeight(weightLbs) {
  if (!Number.isFinite(weightLbs)) {
    return { valid: false, message: "Please enter a valid numeric weight." };
  }
  if (weightLbs <= 0) {
    return { valid: false, message: "Please enter a valid weight greater than 0." };
  }
  if (weightLbs >= 500) {
    return { valid: false, message: "Please enter a realistic cat weight." };
  }
  if (weightLbs > 30) {
    return {
      valid: true,
      warning:
        "This is unusually high for a cat. Please verify units (lbs vs kg) before using these dosages."
    };
  }
  return { valid: true };
}

function calculateFromLbs(weightLbs) {
  // Shared intermediate value from formulas source-of-truth.
  const weightKg = weightLbs * FORMULAS.lbToKg;

  // Metronidazole
  const metroMgNeeded = weightKg * FORMULAS.medications.metronidazole.mgPerKg;
  const metroDosageML = metroMgNeeded / FORMULAS.medications.metronidazole.concentrationMgPerML;

  // Pyrantel
  const pyrantelDosageML = weightLbs * FORMULAS.medications.pyrantel.mlPerLbs;

  // Albon
  const albonMgNeeded = weightKg * FORMULAS.medications.albon.mgPerKg;
  const albonDay1ML = albonMgNeeded / FORMULAS.medications.albon.concentrationMgPerML;
  const albonDay2to9ML = albonDay1ML / 2;

  // Panacur
  const panacurMgNeeded = weightKg * FORMULAS.medications.panacur.mgPerKg;
  const panacurDosageML = panacurMgNeeded / FORMULAS.medications.panacur.concentrationMgPerML;

  return {
    input: {
      weightLbs,
      weightKg
    },
    metronidazole: {
      dosageML: metroDosageML
    },
    pyrantel: {
      dosageML: pyrantelDosageML
    },
    albon: {
      day1ML: albonDay1ML,
      day2to9ML: albonDay2to9ML
    },
    panacur: {
      dosageML: panacurDosageML
    }
  };
}

function normalizeWeight(inputWeight, unit) {
  if (unit === "kg") {
    return inputWeight / FORMULAS.lbToKg;
  }
  return inputWeight;
}

function calculate(weightInput, unit) {
  const inputWeight = Number(weightInput);
  if (!Number.isFinite(inputWeight)) {
    return { ok: false, error: "Please enter a valid numeric weight." };
  }

  const weightLbs = normalizeWeight(inputWeight, unit);
  const validation = validateWeight(weightLbs);
  if (!validation.valid) {
    return { ok: false, error: validation.message };
  }

  const results = calculateFromLbs(weightLbs);
  return { ok: true, results, warning: validation.warning || "" };
}

function setValidationMessage(message, isWarning) {
  const el = document.getElementById("validation-message");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("warning", Boolean(isWarning));
}

function setUnit(unit) {
  currentUnit = unit;
  document.querySelectorAll(".unit-btn").forEach((btn) => {
    const isActive = btn.dataset.unit === unit;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });
  const next = document.getElementById(screenId);
  if (next) next.classList.add("active");
}

function showResults(results) {
  const lbsText = `${results.input.weightLbs.toFixed(2)} lbs`;
  document.getElementById("summary-text").textContent = `Dosages for a ${lbsText} cat`;

  document.getElementById("metro-value").textContent = formatML(results.metronidazole.dosageML);
  document.getElementById("pyrantel-value").textContent = formatML(results.pyrantel.dosageML);
  document.getElementById("albon-day1-value").textContent = formatML(results.albon.day1ML);
  document.getElementById("albon-day2to9-value").textContent = formatML(results.albon.day2to9ML);
  document.getElementById("panacur-value").textContent = formatML(results.panacur.dosageML);
  resetMedicationSelections();
  setResultsMessage("");

  showScreen("results-screen");
}

function setResultsMessage(message) {
  const el = document.getElementById("results-message");
  if (!el) return;
  el.textContent = message || "";
}

function setMedicationCardState(medication, isGiven) {
  const card = document.querySelector(`.med-card[data-medication="${medication}"]`);
  if (card) {
    card.classList.toggle("med-given", isGiven);
  }
}

function resetMedicationSelections() {
  medicationSelections = Object.fromEntries(MEDICATION_KEYS.map((key) => [key, false]));
  document.querySelectorAll(".med-check-input").forEach((checkbox) => {
    checkbox.checked = false;
    setMedicationCardState(checkbox.dataset.medication, false);
  });
}

function getSelectedMedications() {
  return MEDICATION_KEYS.filter((key) => medicationSelections[key]);
}

function applyPrintMedicationVisibility(selectedMeds) {
  const visibleSet = new Set(selectedMeds);
  MEDICATION_KEYS.forEach((key) => {
    const medEl = document.getElementById(`print-med-${key}`);
    if (medEl) {
      medEl.style.display = visibleSet.has(key) ? "block" : "none";
    }
  });

  const lastVisibleMedication = [...MEDICATION_KEYS].reverse().find((key) => visibleSet.has(key));
  MEDICATION_KEYS.forEach((key) => {
    const sepEl = document.getElementById(`print-sep-${key}`);
    if (!sepEl) return;
    sepEl.style.display = visibleSet.has(key) && key !== lastVisibleMedication ? "block" : "none";
  });
}

function resetToInput() {
  showScreen("input-screen");
  const input = document.getElementById("weight-input");
  if (input && Number.isFinite(currentWeightLbs)) {
    if (currentUnit === "kg") {
      input.value = (currentWeightLbs * FORMULAS.lbToKg).toFixed(2);
    } else {
      input.value = currentWeightLbs.toFixed(2);
    }
  }
}

function openPrintModal() {
  if (!currentResults) return;
  const selectedMeds = getSelectedMedications();
  if (selectedMeds.length === 0) {
    setResultsMessage("Select at least one medication before printing the dosage sheet.");
    return;
  }
  setResultsMessage("");
  const modal = document.getElementById("print-modal");
  const nameInput = document.getElementById("cat-name-input");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  if (nameInput) {
    nameInput.value = catName;
    nameInput.focus();
  }
}

function closePrintModal() {
  const modal = document.getElementById("print-modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function triggerPrint(name) {
  catName = (name || "").trim() || "Your Cat";
  if (!currentResults) return;
  const selectedMeds = getSelectedMedications();
  if (selectedMeds.length === 0) {
    closePrintModal();
    setResultsMessage("Select at least one medication before printing the dosage sheet.");
    return;
  }

  const today = new Date().toLocaleDateString();
  const lbs = currentResults.input.weightLbs.toFixed(2);
  const kg = currentResults.input.weightKg.toFixed(2);

  document.getElementById("print-cat-name").textContent = catName;
  document.getElementById("print-date").textContent = today;
  document.getElementById("print-weight").textContent = `${lbs} lbs / ${kg} kg`;

  document.getElementById("print-metro").textContent = formatML(currentResults.metronidazole.dosageML);
  document.getElementById("print-pyrantel").textContent = formatML(currentResults.pyrantel.dosageML);
  document.getElementById("print-albon-day1").textContent = formatML(currentResults.albon.day1ML);
  document.getElementById("print-albon-day2to9").textContent = formatML(currentResults.albon.day2to9ML);
  document.getElementById("print-panacur").textContent = formatML(currentResults.panacur.dosageML);
  applyPrintMedicationVisibility(selectedMeds);

  closePrintModal();
  window.print();
}

function syncConcentrationLabels() {
  const labelMap = {
    "metro-concentration": `${FORMULAS.medications.metronidazole.concentrationMgPerML}mg / 1ml`,
    "pyrantel-concentration": FORMULAS.medications.pyrantel.concentrationLabel,
    "albon-concentration": FORMULAS.medications.albon.concentrationLabel,
    "panacur-concentration": `${FORMULAS.medications.panacur.concentrationMgPerML}mg / 1ml`
  };
  Object.entries(labelMap).forEach(([id, text]) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  });
}

function runVerification() {
  const epsilon = 0.005;
  const checks = [];

  const canonical = calculate(4.6875, "lbs");
  checks.push(
    canonical.ok &&
      Math.abs(canonical.results.metronidazole.dosageML - 0.425242846875) < epsilon &&
      formatML(canonical.results.metronidazole.dosageML) === "0.43"
  );
  checks.push(canonical.ok && formatML(canonical.results.pyrantel.dosageML) === "0.47");
  checks.push(canonical.ok && formatML(canonical.results.albon.day1ML) === "2.34");
  checks.push(canonical.ok && formatML(canonical.results.albon.day2to9ML) === "1.17");
  checks.push(canonical.ok && formatML(canonical.results.panacur.dosageML) === "1.06");

  const lbsRun = calculate(8.5, "lbs");
  const kgRun = calculate(8.5 * FORMULAS.lbToKg, "kg");
  checks.push(
    lbsRun.ok &&
      kgRun.ok &&
      Math.abs(lbsRun.results.metronidazole.dosageML - kgRun.results.metronidazole.dosageML) < 1e-9
  );

  checks.push(calculate(0, "lbs").ok === false);
  checks.push(calculate("abc", "lbs").ok === false);
  checks.push(calculate(500, "lbs").ok === false);
  checks.push(calculate(0.1, "lbs").ok === true);
  checks.push(calculate(29.99, "lbs").ok === true);

  const boundaryWeights = [0.5, 4.6875, 8.5, 16.25, 29.99];
  boundaryWeights.forEach((lbsWeight) => {
    const lbsResult = calculate(lbsWeight, "lbs");
    const kgResult = calculate(lbsWeight * FORMULAS.lbToKg, "kg");
    checks.push(
      lbsResult.ok &&
        kgResult.ok &&
        formatML(lbsResult.results.metronidazole.dosageML) === formatML(kgResult.results.metronidazole.dosageML) &&
        formatML(lbsResult.results.pyrantel.dosageML) === formatML(kgResult.results.pyrantel.dosageML) &&
        formatML(lbsResult.results.albon.day1ML) === formatML(kgResult.results.albon.day1ML) &&
        formatML(lbsResult.results.albon.day2to9ML) === formatML(kgResult.results.albon.day2to9ML) &&
        formatML(lbsResult.results.panacur.dosageML) === formatML(kgResult.results.panacur.dosageML)
    );
  });

  const passed = checks.every(Boolean);
  return { passed, checks, passedCount: checks.filter(Boolean).length, total: checks.length };
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      // eslint-disable-next-line no-console
      console.warn("Service worker registration failed", error);
    });
  });
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIphone = /iPhone/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  return isIphone && isSafari;
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function setupIosInstallHint() {
  const hint = document.getElementById("ios-install-hint");
  const dismissButton = document.getElementById("ios-install-dismiss");
  if (!hint || !dismissButton) return;

  dismissButton.addEventListener("click", () => {
    hint.classList.remove("open");
    window.localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, "1");
  });

  if (!isIosSafari() || isStandalone()) return;
  if (window.localStorage.getItem(IOS_INSTALL_DISMISSED_KEY) === "1") return;

  const lastShownAt = Number(window.localStorage.getItem(IOS_INSTALL_LAST_SHOWN_KEY) || "0");
  const now = Date.now();
  if (now - lastShownAt < IOS_INSTALL_COOLDOWN_MS) return;

  hint.classList.add("open");
  window.localStorage.setItem(IOS_INSTALL_LAST_SHOWN_KEY, String(now));
}

function attachEvents() {
  const form = document.getElementById("weight-form");
  const input = document.getElementById("weight-input");

  document.querySelectorAll(".unit-btn").forEach((btn) => {
    btn.addEventListener("click", () => setUnit(btn.dataset.unit));
  });
  document.querySelectorAll(".med-check-input").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const medication = event.currentTarget.dataset.medication;
      const isChecked = event.currentTarget.checked;
      medicationSelections[medication] = isChecked;
      setMedicationCardState(medication, isChecked);
      if (isChecked) {
        setResultsMessage("");
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const outcome = calculate(input.value, currentUnit);
    if (!outcome.ok) {
      setValidationMessage(outcome.error, false);
      return;
    }

    currentResults = outcome.results;
    currentWeightLbs = outcome.results.input.weightLbs;
    setValidationMessage(outcome.warning || "", Boolean(outcome.warning));
    showResults(outcome.results);
  });

  document.getElementById("change-weight-btn").addEventListener("click", resetToInput);
  document.getElementById("logo-home-btn").addEventListener("click", resetToInput);
  document.getElementById("print-open-btn").addEventListener("click", openPrintModal);
  document.getElementById("modal-cancel-btn").addEventListener("click", closePrintModal);
  document.getElementById("modal-print-btn").addEventListener("click", () => {
    const name = document.getElementById("cat-name-input").value;
    triggerPrint(name);
  });

  document.getElementById("print-modal").addEventListener("click", (event) => {
    if (event.target.id === "print-modal") closePrintModal();
  });
}

function init() {
  setUnit("lbs");
  syncConcentrationLabels();
  attachEvents();
  setupIosInstallHint();
  registerServiceWorker();
  const verification = runVerification();
  if (!verification.passed) {
    // Keep signal visible to developers during local runs.
    // eslint-disable-next-line no-console
    console.error("Formula verification failed", verification);
  } else {
    // eslint-disable-next-line no-console
    console.info(`Formula verification passed (${verification.passedCount}/${verification.total})`);
  }
}

window.addEventListener("DOMContentLoaded", init);
