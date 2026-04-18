/* global THREE, Chart */

const SYMPTOM_LABELS = {
  fever: "Fever",
  cough: "Cough",
  sore_throat: "Sore throat",
  runny_nose: "Runny nose",
  sneezing: "Sneezing",
  shortness_of_breath: "Shortness of breath",
  fatigue: "Fatigue",
  headache: "Headache",
  nausea: "Nausea",
  vomiting: "Vomiting",
  diarrhea: "Diarrhea",
  abdominal_pain: "Abdominal pain",
  muscle_pain: "Muscle pain",
  chills: "Chills",
  body_aches: "Body aches",
  loss_of_appetite: "Loss of appetite",
  congestion: "Nasal congestion",
  watery_eyes: "Watery eyes",
};

// Lightweight tooltips (frontend-only descriptions).
const SYMPTOM_DESCRIPTIONS = {
  fever: "Elevated body temperature; common in many infections.",
  cough: "A reflex to clear airways; seen with respiratory infections.",
  sore_throat: "Pain or irritation in the throat, often viral or bacterial.",
  runny_nose: "Excess nasal discharge; typical in colds and allergies.",
  sneezing: "Nasal irritation response; common with viral URIs.",
  shortness_of_breath: "Feeling like you can't get enough air; urgent if severe.",
  fatigue: "Low energy and tiredness that can accompany infections.",
  headache: "Pain in the head; can occur with fever/illness.",
  nausea: "Feeling like you might vomit; common with GI infections.",
  vomiting: "Forceful expulsion of stomach contents; can lead to dehydration.",
  diarrhea: "Frequent loose stools; common with gastroenteritis.",
  abdominal_pain: "Cramping or discomfort in the belly.",
  muscle_pain: "Body aches; often seen with flu-like illnesses.",
  chills: "Shivering sensation, sometimes with fever.",
  body_aches: "Generalized aches in muscles or joints.",
  loss_of_appetite: "Reduced desire to eat; can happen during illness.",
  congestion: "Nasal blockage and swelling.",
  watery_eyes: "Excess tearing; can happen with upper respiratory symptoms.",
};

const HISTORY_KEY = "predictionHistory";
const LAST_DISEASE_KEY = "lastPredictedDisease";

let probabilityChart = null;

const DISEASE_INFO = {
  "Common Cold": {
    description:
      "A common viral infection that typically affects the nose and throat.",
    causes: ["Viral infections (e.g., rhinoviruses)", "Close contact with infected people"],
    commonSymptoms: ["Sneezing", "Runny nose", "Sore throat", "Cough"],
    basicTreatment: ["Rest and fluids", "OTC relief for pain/fever (as appropriate)", "Saline nasal rinse"],
    precautions: {
      homeRemedies: ["Warm fluids and steam inhalation", "Honey for cough (for adults)", "Humidifier or saline spray"],
      preventionTips: ["Wash hands regularly", "Avoid close contact with sick people", "Don’t share utensils"],
      whenToConsultDoctor:
        "Seek medical advice if symptoms are severe, last more than 10 days, or you have trouble breathing or high fever.",
    },
  },
  Influenza: {
    description:
      "Influenza is a contagious respiratory illness that can cause fever and strong fatigue.",
    causes: ["Influenza viruses (types A/B)", "Exposure to infected droplets"],
    commonSymptoms: ["Fever", "Cough", "Headache", "Body aches", "Fatigue", "Chills"],
    basicTreatment: ["Rest and fluids", "OTC symptom relief", "Antiviral treatment may help if started early (doctor prescribed)"],
    precautions: {
      homeRemedies: ["Hydration and rest", "Warm soups/broths", "Fever comfort measures"],
      preventionTips: ["Get vaccinated", "Cover coughs and wash hands", "Stay home when sick"],
      whenToConsultDoctor:
        "Consult a doctor urgently if you have breathing difficulty, chest pain, confusion, dehydration, or symptoms that worsen quickly.",
    },
  },
  "COVID-19": {
    description:
      "COVID-19 is caused by the SARS-CoV-2 virus and can affect the respiratory system and beyond.",
    causes: ["SARS-CoV-2 infection", "Exposure to respiratory droplets/aerosols"],
    commonSymptoms: ["Fever", "Cough", "Shortness of breath", "Fatigue", "Headache", "Loss of appetite"],
    basicTreatment: ["Rest and fluids", "Symptom relief (as appropriate)", "Follow local guidance on testing/isolation"],
    precautions: {
      homeRemedies: ["Stay hydrated", "Monitor symptoms", "Use a humidifier for comfort"],
      preventionTips: ["Wear a mask in crowded indoor spaces if needed", "Improve ventilation", "Stay up to date with vaccines/boosters"],
      whenToConsultDoctor:
        "Get medical care if you have severe shortness of breath, persistent chest pain, bluish lips/face, confusion, or worsening symptoms.",
    },
  },
  Gastroenteritis: {
    description:
      "Gastroenteritis is inflammation of the stomach and intestines, often causing nausea, vomiting, and diarrhea.",
    causes: ["Viral infection", "Food or water contamination", "Bacterial infection (less commonly)"],
    commonSymptoms: ["Nausea", "Vomiting", "Diarrhea", "Abdominal pain", "Loss of appetite", "Fever (sometimes)"],
    basicTreatment: ["Oral rehydration (small sips frequently)", "Bland foods as tolerated", "Rest"],
    precautions: {
      homeRemedies: ["Oral rehydration solution (preferred)", "Light/bland meals", "Avoid alcohol and heavy/spicy foods"],
      preventionTips: ["Wash hands thoroughly", "Drink safe water", "Cook foods properly and avoid cross-contamination"],
      whenToConsultDoctor:
        "Consult a doctor if there is blood in stool, severe dehydration, persistent high fever, severe abdominal pain, or symptoms lasting more than 2–3 days.",
    },
  },
};

function getCurrentPath() {
  return window.location.pathname.toLowerCase();
}

function isPredictorPage() {
  return getCurrentPath().includes("predictor");
}

function isHistoryPage() {
  return getCurrentPath().includes("history");
}

function isDiseasePage() {
  return getCurrentPath().includes("disease");
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function saveLastPredictedDisease(diseaseName) {
  localStorage.setItem(LAST_DISEASE_KEY, diseaseName);
}

function loadLastPredictedDisease() {
  return localStorage.getItem(LAST_DISEASE_KEY) || "";
}

function formatPercent(x01) {
  return `${(x01 * 100).toFixed(1)}%`;
}

function getSelectedSymptoms() {
  const checked = Array.from(
    document.querySelectorAll('input[name="symptom"]:checked')
  );
  return checked.map((el) => el.value);
}

function symptomsToLabels(symptomIds) {
  return symptomIds.map((id) => SYMPTOM_LABELS[id]).filter(Boolean);
}

function renderHistory(items) {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.textContent = "No predictions yet.";
    historyList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const el = document.createElement("div");
    el.className = "history-item";

    const date = item.timestamp
      ? new Date(item.timestamp).toLocaleString()
      : "";

    el.innerHTML = `
      <div class="history-meta">${date}</div>
      <div class="history-main"><strong>${item.predicted_disease}</strong> - ${formatPercent(item.confidence || 0)}</div>
    `;
    historyList.appendChild(el);
  }
}

function updateChart(probabilities) {
  const canvas = document.getElementById("probabilityChart");
  if (!canvas) return;
  if (typeof Chart === "undefined") return;

  const labels = probabilities.map((p) => p.disease);
  const data = probabilities.map((p) => Number((p.probability * 100).toFixed(1)));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 10, left: 0, right: 0, bottom: 0 } },
    animation: { duration: 350 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            return ` ${value}%`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148,163,184,0.18)" },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#cbd5e1",
          callback: function (value) {
            return `${value}%`;
          },
        },
        grid: { color: "rgba(148,163,184,0.18)" },
      },
    },
  };

  const dataset = {
    label: "Probability (%)",
    data,
    backgroundColor: "rgba(99, 102, 241, 0.72)",
    borderColor: "rgba(99, 102, 241, 1)",
    borderWidth: 1,
    borderRadius: 10,
  };

  if (probabilityChart) {
    probabilityChart.data.labels = labels;
    probabilityChart.data.datasets[0].data = data;
    probabilityChart.update();
    return;
  }

  probabilityChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [dataset] },
    options,
  });
}

function initThreeViewer() {
  const container = document.getElementById("three-container");
  if (!container) return;
  if (typeof THREE === "undefined") return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  container.innerHTML = "";
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Basic lighting so the cube looks 3D without heavy assets.
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0x7c3aed, 0.9);
  dir.position.set(3, 4, 2);
  scene.add(dir);

  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    metalness: 0.35,
    roughness: 0.45,
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  function onPointerDown(e) {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Directly rotate for a simple, stable user experience.
    cube.rotation.y += dx * 0.01;
    cube.rotation.x += dy * 0.01;
  }

  function onPointerUp() {
    isDragging = false;
  }

  container.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);

    // Gentle auto-rotation so it looks alive even without interaction.
    if (!isDragging) {
      cube.rotation.y += 0.01;
      cube.rotation.x += 0.006;
    }

    renderer.render(scene, camera);
  }

  animate();
}

function initPredictor() {
  if (!isPredictorPage()) return;

  const form = document.getElementById("symptomsForm");
  if (!form) return; // index/about pages

  const errorEl = document.getElementById("formError");
  const resultSection = document.getElementById("resultSection");
  const resultDisease = document.getElementById("resultDisease");
  const resultConfidence = document.getElementById("resultConfidence");
  const resultExplanation = document.getElementById("resultExplanation");
  const resultAccuracy = document.getElementById("resultAccuracy");
  const riskBadge = document.getElementById("riskBadge");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const viewDetailsBtn = document.getElementById("viewDetailsBtn");

  function computeRiskLevel(symptomCount) {
    if (symptomCount <= 5) return { level: "Low", className: "risk-low" };
    if (symptomCount <= 12) return { level: "Medium", className: "risk-medium" };
    return { level: "High", className: "risk-high" };
  }

  function setRiskBadge(selectedCount) {
    if (!riskBadge) return;
    const risk = computeRiskLevel(selectedCount);
    riskBadge.classList.remove("risk-low", "risk-medium", "risk-high", "risk-unknown");
    riskBadge.classList.add(risk.className);
    riskBadge.textContent = `Risk Level: ${risk.level}`;
  }

  function setExplanationFromSelectedSymptoms(selectedLabels) {
    const top3 = (selectedLabels || []).slice(0, 3);
    resultExplanation.textContent =
      top3.length > 0 ? `Main contributing symptoms: ${top3.join(", ")}` : "Main contributing symptoms: —";
  }

  function showLoading(show) {
    if (!loadingOverlay) return;
    loadingOverlay.classList.toggle("hidden", !show);
  }

  function resetUI() {
    // Clear symptoms
    const checked = document.querySelectorAll('input[name="symptom"]:checked');
    checked.forEach((el) => (el.checked = false));

    // Reset result + details
    if (resultSection) resultSection.classList.add("hidden");
    if (errorEl) errorEl.textContent = "";
    if (resultDisease) resultDisease.textContent = "—";
    if (resultConfidence) resultConfidence.textContent = "—";
    if (resultExplanation) resultExplanation.textContent = "";
    if (resultAccuracy) resultAccuracy.textContent = "—";
    if (viewDetailsBtn) viewDetailsBtn.classList.add("hidden");

    if (riskBadge) {
      riskBadge.classList.remove("risk-low", "risk-medium", "risk-high");
      riskBadge.classList.add("risk-unknown");
      riskBadge.textContent = "Risk Level: —";
    }

    if (document.getElementById("probabilityChart")) {
      updateChart([]); // Clears chart labels/data
    }
  }

  function initSymptomTooltips() {
    const tooltipEl = document.getElementById("symptomTooltip");
    if (!tooltipEl) return;

    function showTooltip(text, e) {
      if (!text) return;
      tooltipEl.textContent = text;
      tooltipEl.classList.remove("hidden");
      tooltipEl.setAttribute("aria-hidden", "false");
      tooltipEl.style.left = `${e.clientX + 12}px`;
      tooltipEl.style.top = `${e.clientY + 12}px`;
    }

    function moveTooltip(e) {
      if (tooltipEl.classList.contains("hidden")) return;
      tooltipEl.style.left = `${e.clientX + 12}px`;
      tooltipEl.style.top = `${e.clientY + 12}px`;
    }

    function hideTooltip() {
      tooltipEl.classList.add("hidden");
      tooltipEl.setAttribute("aria-hidden", "true");
    }

    const inputs = document.querySelectorAll('input[name="symptom"]');
    inputs.forEach((input) => {
      const symptomId = input.value;
      const item = input.closest(".symptom-item");
      if (!item) return;

      const text = SYMPTOM_DESCRIPTIONS[symptomId] || "";
      item.addEventListener("mouseenter", (e) => showTooltip(text, e));
      item.addEventListener("mousemove", moveTooltip);
      item.addEventListener("mouseleave", hideTooltip);
    });
  }

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetUI);

  initSymptomTooltips();

  if (viewDetailsBtn) {
    viewDetailsBtn.addEventListener("click", () => {
      const diseaseName = loadLastPredictedDisease();
      if (diseaseName) {
        window.location.href = "/disease";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorEl) errorEl.textContent = "";

    const selected = getSelectedSymptoms();
    if (!selected.length) {
      if (errorEl) errorEl.textContent = "Please select at least one symptom.";
      return;
    }

    const payload = { selected_symptoms: selected };

    try {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;

      showLoading(true);
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Prediction failed.");
      }

      const disease = data.predicted_disease;
      const confidence = data.confidence;
      const probabilities = data.probabilities || [];
      const modelAccuracy = typeof data.model_accuracy === "number" ? data.model_accuracy : null;

      const selectedLabels = symptomsToLabels(selected);
      setRiskBadge(selected.length);

      // Update result UI.
      resultDisease.textContent = disease;
      resultConfidence.textContent = formatPercent(confidence);
      setExplanationFromSelectedSymptoms(selectedLabels);
      if (resultAccuracy && modelAccuracy !== null) {
        resultAccuracy.textContent = formatPercent(modelAccuracy);
      }

      // Reveal section if hidden.
      if (resultSection) resultSection.classList.remove("hidden");

      // Update chart.
      if (document.getElementById("probabilityChart")) {
        updateChart(probabilities);
      }

      saveLastPredictedDisease(disease);
      if (viewDetailsBtn) viewDetailsBtn.classList.remove("hidden");

      // Save to local history (last 5).
      const nextItem = {
        timestamp: Date.now(),
        predicted_disease: disease,
        confidence,
        probabilities,
        selected_symptoms: selected,
      };

      const items = loadHistory();
      items.unshift(nextItem);
      const trimmed = items.slice(0, 5);
      saveHistory(trimmed);
    } catch (err) {
      if (errorEl) errorEl.textContent = err.message || "Prediction failed.";
    } finally {
      showLoading(false);
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
      if (resetBtn) resetBtn.disabled = false;
    }
  });
}

function initDiseasePage() {
  if (!isDiseasePage()) return;

  const diseaseName = loadLastPredictedDisease();
  const info = DISEASE_INFO[diseaseName];

  const titleEl = document.getElementById("diseasePageTitle");
  const subtitleEl = document.getElementById("diseasePageSubtitle");
  const descriptionEl = document.getElementById("detailDescription");
  const causesEl = document.getElementById("detailCauses");
  const symptomsEl = document.getElementById("detailCommonSymptoms");
  const treatmentEl = document.getElementById("detailTreatment");

  if (!titleEl || !subtitleEl || !descriptionEl || !causesEl || !symptomsEl || !treatmentEl) {
    return;
  }

  if (!diseaseName || !info) {
    titleEl.textContent = "Disease Information";
    subtitleEl.textContent = "No predicted disease found yet. Please make a prediction first.";
    descriptionEl.textContent = "—";
    causesEl.textContent = "—";
    symptomsEl.textContent = "—";
    treatmentEl.textContent = "—";
    return;
  }

  titleEl.textContent = diseaseName;
  subtitleEl.textContent = "Detailed information for the most recently predicted disease.";
  descriptionEl.textContent = info.description || "—";
  causesEl.textContent = Array.isArray(info.causes) ? info.causes.join(", ") : info.causes || "—";
  symptomsEl.textContent = Array.isArray(info.commonSymptoms)
    ? info.commonSymptoms.join(", ")
    : info.commonSymptoms || "—";
  treatmentEl.textContent = Array.isArray(info.basicTreatment)
    ? info.basicTreatment.join(", ")
    : info.basicTreatment || "—";
}

function initHistoryPage() {
  if (!isHistoryPage()) return;

  const historyList = document.getElementById("historyList");
  if (historyList) {
    renderHistory(loadHistory());
  }

  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory([]);
    });
  }
}

function initNavbarActiveState() {
  const currentPath = getCurrentPath();
  const navLinks = document.querySelectorAll(".nav-links a");
  if (!navLinks.length) return;

  navLinks.forEach((link) => {
    link.classList.remove("active");

    const href = link.getAttribute("href") || "";
    if (!href) return;

    if (href === "/" && (currentPath === "/" || currentPath.endsWith("/index.html"))) {
      link.classList.add("active");
      return;
    }

    if (href === "/about" && currentPath.includes("about")) {
      link.classList.add("active");
      return;
    }

    if (href === "/predictor" && currentPath.includes("predictor")) {
      link.classList.add("active");
      return;
    }

    if (href === "/disease" && currentPath.includes("disease")) {
      link.classList.add("active");
      return;
    }

    if (href === "/history" && currentPath.includes("history")) {
      link.classList.add("active");
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavbarActiveState();

  if (isPredictorPage()) {
    if (document.getElementById("three-container")) {
      initThreeViewer();
    }

    if (document.getElementById("symptomsForm")) {
      initPredictor();
    }
  }

  if (isDiseasePage()) {
    initDiseasePage();
  }

  if (isHistoryPage()) {
    initHistoryPage();
  }
});

