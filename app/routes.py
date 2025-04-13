from flask import Flask, jsonify, render_template, request
import pandas as pd
import numpy as np
import pickle
import shap
import math
from .utils import load_data, filter_data, calculate_inflation_factor, calculate_dists

app = Flask(__name__)
df = load_data()

with open('./model/model.pkl', 'rb') as file:
    model = pickle.load(file)

explainer = shap.TreeExplainer(model)

inflation_data = pd.read_csv('./data/CBR_mortgage.csv')
inflation_data.date = pd.to_datetime(inflation_data.date)
inflation_data.set_index('date', inplace=True)

with open('./data/poi_coords.pkl', 'rb') as f:
    poi_coords = pickle.load(f)

expected_feature_names = [
    'rooms_count', 'floors_count', 'longitude', 'latitude', 'total_meters',
    'floor', 'dist_to_school_km', 'dist_to_bus_stop_km', 'dist_to_park_km',
    'dist_to_hospital_km', 'dist_to_sea_km', 'Yearly rate (%)',
    'New mortgages', 'New mortgage amount (millions)', 'dist_to_center_km'
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data', methods=['GET'])
def get_data():
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'min_floor': request.args.get('min_floor', type=int),
        'max_floor': request.args.get('max_floor', type=int),
        'min_price': request.args.get('min_price', type=float),
        'max_price': request.args.get('max_price', type=float),
        'rooms': request.args.getlist('rooms', type=int)
    }
    filtered_df = filter_data(df, filters)
    return jsonify(filtered_df.to_dict(orient='records'))

def get_input_data():
    data = request.json
    
    dists = calculate_dists(data['latitude'], data['longitude'], poi_coords)
    data = {**data, **dists}
    
    date = pd.to_datetime(data['date'])
    
    nearest_date = inflation_data.index[inflation_data.index.get_indexer([date], method='nearest')[0]]
    nearest_economic_data = inflation_data.loc[nearest_date]
    
    economic_features = {
        'Yearly rate (%)': nearest_economic_data['Yearly rate (%)'],
        'New mortgages': nearest_economic_data['New mortgages'],
        'New mortgage amount (millions)': nearest_economic_data['New mortgage amount (millions)']
    }
    data = {**data, **economic_features}
    
    input_data = pd.DataFrame([data]).drop(columns=['date'], errors='ignore')
    input_data = input_data[expected_feature_names]

    return date, input_data

@app.route('/predict', methods=['POST'])
def predict():
    date, input_data = get_input_data()
    
    inflation_factor = calculate_inflation_factor("2019-01-01", date, inflation_data, forecast_value=0.1)
    prediction = inflation_factor * math.exp(model.predict(input_data)[0])
    
    return jsonify({'price': prediction})

@app.route('/predict_with_importance', methods=['POST'])
def predict_with_importance():
    date, input_data = get_input_data()

    inflation_factor = calculate_inflation_factor("2019-01-01", date, inflation_data, forecast_value=0.1)
    prediction = inflation_factor * math.exp(model.predict(input_data)[0])
    
    shap_values = explainer.shap_values(input_data)
    feature_names = input_data.columns
    importance_df = pd.DataFrame({
        'Feature': feature_names,
        'Importance': np.abs(shap_values[0])
    })
    importance_df['Importance'] = importance_df['Importance'] / importance_df['Importance'].sum() * 100
    
    importance_dict = importance_df.set_index('Feature')['Importance'].to_dict()
    
    return jsonify({
        'price': prediction,
        'feature_importance': importance_dict
    })

if __name__ == '__main__':
    app.run(debug=True)