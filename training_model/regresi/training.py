import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

df = pd.read_csv('mock_data.csv')


X = df[['ph_level', 'moisture', 'volume_kg']] #fitur
y = df['purity_score'] #target

#latih
model = LinearRegression()
model.fit(X, y)


joblib.dump(model, 'symbio_model.pkl') # Simpan model sebagai format .pkl
print("✅ SUCCESS: Model berhasil dilatih dan disimpan ke symbio_model.pkl")