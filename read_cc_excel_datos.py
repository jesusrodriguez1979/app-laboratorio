import pandas as pd
file_path = "CC Q300 VFINAL1.xlsm"

df_datos = pd.read_excel(file_path, sheet_name="Datos", nrows=5)
print("=== HOJA: Datos ===")
print(df_datos.to_string())
print("\nColumnas:")
print(list(df_datos.columns))
