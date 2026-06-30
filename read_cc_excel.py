import pandas as pd
import json

file_path = "CC Q300 VFINAL1.xlsm"

try:
    df_datos = pd.read_excel(file_path, sheet_name="datos", nrows=5)
    print("=== HOJA: datos ===")
    print(df_datos.to_string())
    print("\nColumnas:")
    print(list(df_datos.columns))
except Exception as e:
    print(f"Error reading 'datos': {e}")

try:
    df_carta = pd.read_excel(file_path, sheet_name="carta 0", nrows=5)
    print("\n=== HOJA: carta 0 ===")
    print(df_carta.to_string())
except Exception as e:
    print(f"Error reading 'carta 0': {e}")
