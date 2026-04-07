"use strict";

let currentWeightLbs = null;
let currentUnit = "lbs";
let catName = "";
let currentResults = null;

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
  const weightKg = weightLbs * 0.45359237;

  // Metronidazole
  const metroMgNeeded = weightKg * 10;
  const metroDosageML = metroMgNeeded / 50;

  // Pyrantel
  const pyrantelDosageML = weightLbs / 10;

  // Albon
  const albonMgNeeded = weightKg * 55;
  const albonDay1ML = albonMgNeeded / 50;
  const albonDay2to9ML = albonDay1ML / 2;

  // Panacur
  const panacurDosageML = weightKg / 2;

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
    return inputWeight / 0.45359237;
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

  showScreen("results-screen");
}

function resetToInput() {
  showScreen("input-screen");
  const input = document.getElementById("weight-input");
  if (input && Number.isFinite(currentWeightLbs)) {
    if (currentUnit === "kg") {
      input.value = (currentWeightLbs * 0.45359237).toFixed(2);
    } else {
      input.value = currentWeightLbs.toFixed(2);
    }
  }
}

function openPrintModal() {
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

  closePrintModal();
  window.print();
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
  const kgRun = calculate(8.5 * 0.45359237, "kg");
  checks.push(
    lbsRun.ok &&
      kgRun.ok &&
      Math.abs(lbsRun.results.metronidazole.dosageML - kgRun.results.metronidazole.dosageML) < 1e-9
  );

  checks.push(calculate(0, "lbs").ok === false);
  checks.push(calculate("abc", "lbs").ok === false);
  checks.push(calculate(500, "lbs").ok === false);

  const passed = checks.every(Boolean);
  return { passed, checks, passedCount: checks.filter(Boolean).length, total: checks.length };
}

function attachEvents() {
  const form = document.getElementById("weight-form");
  const input = document.getElementById("weight-input");

  document.querySelectorAll(".unit-btn").forEach((btn) => {
    btn.addEventListener("click", () => setUnit(btn.dataset.unit));
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
  attachEvents();
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
