from flask import Flask, jsonify, request, send_from_directory
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Symptom IDs must match the frontend checkbox `value` attributes.
SYMPTOMS = [
    "fever",
    "cough",
    "sore_throat",
    "runny_nose",
    "sneezing",
    "shortness_of_breath",
    "fatigue",
    "headache",
    "nausea",
    "vomiting",
    "diarrhea",
    "abdominal_pain",
    "muscle_pain",
    "chills",
    "body_aches",
    "loss_of_appetite",
    "congestion",
    "watery_eyes",
]

# 4-class simple problem (required 3–4 diseases).
DISEASES = ["Common Cold", "Influenza", "COVID-19", "Gastroenteritis"]


def _vec_from_set(symptom_set: set[str]) -> list[int]:
    return [1 if s in symptom_set else 0 for s in SYMPTOMS]


def train_model() -> tuple[LogisticRegression, float]:
    # Small hardcoded training set (kept intentionally simple/stable).
    training_data: list[tuple[set[str], str]] = [
        # Common Cold
        ({"cough", "sore_throat", "runny_nose", "sneezing", "congestion", "watery_eyes"}, "Common Cold"),
        ({"cough", "runny_nose", "sneezing", "fatigue", "congestion"}, "Common Cold"),
        ({"sore_throat", "runny_nose", "watery_eyes", "loss_of_appetite"}, "Common Cold"),
        ({"cough", "sneezing", "congestion", "headache", "fatigue"}, "Common Cold"),
        ({"cough", "sore_throat", "fever", "runny_nose", "congestion"}, "Common Cold"),

        # Influenza
        ({"fever", "cough", "sore_throat", "fatigue", "headache", "body_aches", "chills", "muscle_pain", "loss_of_appetite"}, "Influenza"),
        ({"fever", "cough", "fatigue", "headache", "body_aches", "chills", "congestion"}, "Influenza"),
        ({"fever", "sore_throat", "fatigue", "muscle_pain", "headache", "body_aches", "loss_of_appetite"}, "Influenza"),
        ({"fever", "cough", "fatigue", "chills", "body_aches", "loss_of_appetite", "congestion"}, "Influenza"),
        ({"fever", "cough", "fatigue", "headache", "muscle_pain", "chills", "loss_of_appetite"}, "Influenza"),

        # COVID-19
        ({"fever", "cough", "shortness_of_breath", "fatigue", "loss_of_appetite", "headache", "body_aches", "congestion"}, "COVID-19"),
        ({"fever", "cough", "shortness_of_breath", "fatigue", "diarrhea", "loss_of_appetite", "headache"}, "COVID-19"),
        ({"cough", "shortness_of_breath", "fatigue", "runny_nose", "sore_throat", "headache", "congestion"}, "COVID-19"),
        ({"fever", "shortness_of_breath", "fatigue", "muscle_pain", "body_aches", "loss_of_appetite"}, "COVID-19"),
        ({"fever", "cough", "shortness_of_breath", "fatigue", "headache", "body_aches", "diarrhea"}, "COVID-19"),

        # Gastroenteritis
        ({"nausea", "vomiting", "diarrhea", "abdominal_pain", "loss_of_appetite", "fever"}, "Gastroenteritis"),
        ({"nausea", "vomiting", "diarrhea", "abdominal_pain", "fatigue", "loss_of_appetite"}, "Gastroenteritis"),
        ({"diarrhea", "abdominal_pain", "loss_of_appetite", "fever"}, "Gastroenteritis"),
        ({"nausea", "vomiting", "abdominal_pain", "diarrhea", "fatigue", "loss_of_appetite"}, "Gastroenteritis"),
        ({"diarrhea", "abdominal_pain", "fatigue", "chills", "loss_of_appetite", "fever"}, "Gastroenteritis"),
    ]

    X = []
    y = []
    for symptom_set, disease in training_data:
        X.append(_vec_from_set(symptom_set))
        y.append(disease)

    # Simple train/test split (e.g., 70% train, 30% test).
    n = len(X)
    split_idx = max(1, int(n * 0.7))
    X_train, y_train = X[:split_idx], y[:split_idx]
    X_test, y_test = X[split_idx:], y[split_idx:]

    model = LogisticRegression(max_iter=1000, solver="lbfgs", random_state=42)
    model.fit(X_train, y_train)

    if X_test and y_test:
        y_pred = model.predict(X_test)
        acc = float(accuracy_score(y_test, y_pred))
    else:
        acc = 1.0

    return model, acc


MODEL, MODEL_ACCURACY = train_model()

app = Flask(__name__)


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/predictor")
def predictor():
    return send_from_directory(BASE_DIR, "predictor.html")


@app.get("/about")
def about():
    return send_from_directory(BASE_DIR, "about.html")


@app.get("/disease")
def disease():
    return send_from_directory(BASE_DIR, "disease.html")


@app.get("/history")
def history():
    return send_from_directory(BASE_DIR, "history.html")


@app.get("/style.css")
def style_css():
    return send_from_directory(BASE_DIR, "style.css")


@app.get("/script.js")
def script_js():
    return send_from_directory(BASE_DIR, "script.js")


@app.post("/predict")
def predict():
    data = request.get_json(silent=True) or {}
    selected_symptoms = data.get("selected_symptoms")

    if not isinstance(selected_symptoms, list):
        return jsonify({"error": "`selected_symptoms` must be a list of symptom IDs."}), 400

    selected_symptoms = [s for s in selected_symptoms if s in SYMPTOMS]
    if not selected_symptoms:
        return jsonify({"error": "Please select at least one symptom."}), 400

    x = _vec_from_set(set(selected_symptoms))
    proba = MODEL.predict_proba([x])[0]
    classes = MODEL.classes_

    prob_map = []
    for disease, p in zip(classes, proba):
        prob_map.append({"disease": disease, "probability": float(p)})

    prob_map.sort(key=lambda item: item["probability"], reverse=True)
    top = prob_map[:4]

    best = top[0]
    return jsonify(
        {
            "predicted_disease": best["disease"],
            "confidence": float(best["probability"]),
            "model_accuracy": MODEL_ACCURACY,
            "probabilities": top,
        }
    )


if __name__ == "__main__":
    # Simple dev server. For production, use a WSGI server.
    app.run(host="0.0.0.0", port=5000, debug=True)

