import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from PIL import Image
import io
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'best_vision_model.h5')

CLASS_NAMES = ['Fly Ash', 'Silica Fume', 'Steel Slag'] 

try:
    vision_model = tf.keras.models.load_model(MODEL_PATH)
    print("Vision Model .h5 berhasil dimuat!")
except Exception as e:
    vision_model = None
    print(f"WARNING: Gagal memuat vision_model.h5. Error: {e}")

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