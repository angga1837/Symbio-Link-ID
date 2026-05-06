import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from PIL import Image
import io
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'best_vision_model.h5')

CLASS_NAMES = ['Fly Ash', 'Silica Fume', 'Steel Slag'] 

def _load_vision_model():
    """Load .h5 model with compatibility handling for different Keras versions."""
    if not os.path.exists(MODEL_PATH):
        print(f"WARNING: Model file not found at {MODEL_PATH}")
        return None
    try:
        model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        print("Vision Model .h5 berhasil dimuat!")
        return model
    except Exception as e1:
        print(f"INFO: Standard load failed ({e1}), trying with safe_mode...")
        try:
            model = tf.keras.models.load_model(MODEL_PATH, compile=False, safe_mode=False)
            print("Vision Model .h5 berhasil dimuat (safe_mode=False)!")
            return model
        except Exception:
            pass
        # Last resort: rebuild the model architecture and load weights
        try:
            from tensorflow.keras.applications import MobileNetV2
            base = MobileNetV2(weights=None, include_top=False, input_shape=(224, 224, 3), pooling='avg')
            x = base.output
            x = tf.keras.layers.Dense(128, activation='relu')(x)
            x = tf.keras.layers.Dropout(0.3)(x)
            output = tf.keras.layers.Dense(len(CLASS_NAMES), activation='softmax')(x)
            model = tf.keras.Model(inputs=base.input, outputs=output)
            model.load_weights(MODEL_PATH)
            print("Vision Model weights loaded via rebuilt architecture!")
            return model
        except Exception as e3:
            print(f"WARNING: All load strategies failed. Last error: {e3}")
            return None


vision_model = _load_vision_model()

def predict_image(image_bytes: bytes) -> str:
    if vision_model is None:
        return "Model Tidak Tersedia"

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img = img.resize((224, 224))
        
        img_array = img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        predictions = vision_model.predict(img_array)
        predicted_class_index = np.argmax(predictions[0])
        
        return CLASS_NAMES[predicted_class_index]
    except Exception as e:
        print(f"Error saat memproses gambar: {e}")
        return "Gagal Identifikasi"