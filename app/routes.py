from flask import Flask, jsonify, render_template, request, send_from_directory, send_file
import pandas as pd
import numpy as np
import pickle
import shap
import math
import zipfile
from io import BytesIO
import os
from utils import load_data, filter_data, calculate_inflation_factor, calculate_dists, initialize_kdtrees
from concurrent.futures import ThreadPoolExecutor

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

initialize_kdtrees(poi_coords)

expected_feature_names = [
    'rooms_count', 'floors_count', 'longitude', 'latitude', 'total_meters',
    'floor', 'dist_to_school_km', 'dist_to_bus_stop_km', 'dist_to_park_km',
    'dist_to_hospital_km', 'dist_to_sea_km', 'Yearly rate (%)',
    'New mortgages', 'New mortgage amount (millions)', 'dist_to_center_km'
]

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/statistics')
def statistics():
    return render_template('statistics.html')

@app.route('/analysis')
def analysis():
    return render_template('analysis.html')

@app.route('/info-data')
def data():
    return render_template('data.html')

@app.route('/js/<path:path>')
def serve_js(path):
    return send_from_directory('static/js', path)

@app.route('/css/<path:path>')
def serve_css(path):
    return send_from_directory('static/css', path)

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
    
    dists = calculate_dists(data['latitude'], data['longitude'])
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
    data_list = request.json

    def process_data(data):
        dists = calculate_dists(data['latitude'], data['longitude'])
        date = pd.to_datetime(data['date'])
        nearest_date = inflation_data.index[inflation_data.index.get_indexer([date], method='nearest')[0]]
        nearest_economic_data = inflation_data.loc[nearest_date]

        economic_features = {
            'Yearly rate (%)': nearest_economic_data['Yearly rate (%)'],
            'New mortgages': nearest_economic_data['New mortgages'],
            'New mortgage amount (millions)': nearest_economic_data['New mortgage amount (millions)']
        }
        input_row = {**data, **dists, **economic_features}
        return input_row

    with ThreadPoolExecutor() as executor:
        batch_data = list(executor.map(process_data, data_list))

    batch_input = pd.DataFrame(batch_data).drop(columns=['date'], errors='ignore')
    batch_input = batch_input[expected_feature_names]

    predictions = model.predict(batch_input)
    inflation_factors = [
        calculate_inflation_factor("2019-01-01", pd.to_datetime(data['date']), inflation_data, forecast_value=0.1)
        for data in data_list
    ]
    adjusted_predictions = [
        inflation_factors[i] * batch_input.iloc[i]['total_meters'] * math.exp(predictions[i])
        for i in range(len(predictions))
    ]

    return jsonify({'prices': adjusted_predictions})

@app.route('/predict_with_importance', methods=['POST'])
def predict_with_importance():
    date, input_data = get_input_data()

    inflation_factor = calculate_inflation_factor("2019-01-01", date, inflation_data, forecast_value=0.1)
    prediction = inflation_factor * input_data.iloc[0]['total_meters'] * math.exp(model.predict(input_data)[0])
    
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

@app.route('/api/mortgage-data')
def mortgage_data():
    df = pd.read_csv('data/CBR_mortgage.csv')
    df['date'] = pd.to_datetime(df['date'])
    df.sort_values('date', inplace=True)
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')  # convert back to string
    return jsonify(df.to_dict(orient='records'))

@app.route('/download_full_data')
def download_full_data():
    data_folder = os.path.join(app.root_path, 'data')
    
    zip_buffer = BytesIO()
    
    # Generate the ZIP file
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(data_folder):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, data_folder)
                zip_file.write(file_path, arcname)
    
    zip_buffer.seek(0)
    
    # Send the ZIP file as a response
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='full_data.zip'
    )

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
