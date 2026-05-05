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
    Memprediksi efisiensi ekstraksi material kritis menggunakan model offline.
    Return: float antara 0.0 hingga 1 (100%)
    """
    if ai_model is None:
        return 0.85 

    features = np.array([[ph, moisture, volume_kg]])
    prediction = ai_model.predict(features)[0]
    
    # Batas hingga 98.6% 
    final_score = min(max(float(prediction), 0.0), 1)
    return round(final_score, 3)