import joblib
import numpy as np
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'symbio_model.pkl')

try:
    ai_model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    ai_model = None
    print("WARNING: Model symbio_model.pkl tidak ditemukan. Mode Fallback aktif.")


def predict_quality(ph: float, moisture: float, volume_kg: float) -> float:
    """
    Legacy 3-feature predictor (backward compatible).
    Returns float between 0.0 and 0.986.
    """
    if ai_model is None:
        return 0.85

    features = np.array([[ph, moisture, volume_kg]])
    prediction = ai_model.predict(features)[0]
    return round(min(max(float(prediction), 0.0), 0.986), 3)


def predict_quality_v2(
    ph: float,
    moisture: float,
    volume_kg: float,
    carbon_pct: float | None = None,
    hydrogen_pct: float | None = None,
    ash_pct: float | None = None,
) -> float:
    """
    Enhanced 6-feature predictor using chemical composition data.

    When carbon/hydrogen/ash values are available, applies a heuristic
    weighting formula on top of the base ML score:
      - High carbon (>40%) is a positive quality signal for fuel recovery
      - Low ash (<20%) is a positive signal (less inert material)
      - Optimal hydrogen (4-8%) improves extractable energy density
      - High ash (>50%) degrades the score (mostly inert filler)

    Returns: float in [0.0, 0.986]
    """
    base_score = predict_quality(ph, moisture, volume_kg)

    # No extra features — return base score unchanged
    if carbon_pct is None and hydrogen_pct is None and ash_pct is None:
        return base_score

    adjustment = 0.0

    if carbon_pct is not None:
        if carbon_pct >= 40:
            adjustment += 0.04
        elif carbon_pct >= 20:
            adjustment += 0.02
        elif carbon_pct < 5:
            adjustment -= 0.03

    if hydrogen_pct is not None:
        if 4.0 <= hydrogen_pct <= 8.0:
            adjustment += 0.02
        elif hydrogen_pct < 2.0:
            adjustment -= 0.02

    if ash_pct is not None:
        if ash_pct > 50:
            adjustment -= 0.05
        elif ash_pct > 30:
            adjustment -= 0.02
        elif ash_pct < 10:
            adjustment += 0.02

    enhanced = base_score + adjustment
    return round(min(max(enhanced, 0.0), 0.986), 3)