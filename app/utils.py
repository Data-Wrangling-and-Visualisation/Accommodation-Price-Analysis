from datetime import datetime
import pandas as pd
import numpy as np
import os

def load_data():
    df = pd.read_csv('./data/main_data.csv')
    df['date'] = pd.to_datetime(df['date'])
    df = df[['price', 'longitude', 'floor', 'floors_count', 'date', 'latitude', 'rooms_count', 'total_meters', 'price_per_sqm', 'price_per_sqm_adjusted', 'cluster']]
    return df

def filter_data(df, filters):
    query = []
    if filters['start_date']:
        query.append(f"date >= '{filters['start_date']}'")
    if filters['end_date']:
        query.append(f"date <= '{filters['end_date']}'")
    if filters['min_floor']:
        query.append(f"floor >= {filters['min_floor']}")
    if filters['max_floor']:
        query.append(f"floor <= {filters['max_floor']}")
    if filters['min_price']:
        query.append(f"price_per_sqm_adjusted >= {filters['min_price']}")
    if filters['max_price']:
        query.append(f"price_per_sqm_adjusted <= {filters['max_price']}")
    if filters['rooms']:
        query.append(f"rooms_count in {tuple(filters['rooms'])}")
    
    return df.query(' and '.join(query)) if query else df

def calculate_inflation_factor(start_date: str, end_date: str, inflation_data: pd.DataFrame, forecast_value: float = 0.1):
    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)
    
    min_available_date = inflation_data.index.min()
    max_available_date = inflation_data.index.max()
    def calculate_within_range(date_start, date_end):
        range_data = inflation_data.loc[date_start:date_end]
        
        yearly_rates = range_data['Yearly rate (%)']
        monthly_rates = yearly_rates / 12 / 100
        
        inflation_multiplier = (1 + monthly_rates).prod()
        return inflation_multiplier
    
    if start_date >= min_available_date and end_date <= max_available_date:
        return calculate_within_range(start_date, end_date)
    elif start_date < min_available_date and end_date <= max_available_date:
        multiplier_before = (1 + forecast_value / 100) ** ((min_available_date - start_date).days / 30)
        multiplier_within = calculate_within_range(min_available_date, end_date)
        return multiplier_before * multiplier_within
    elif start_date >= min_available_date and end_date > max_available_date:
        multiplier_within = calculate_within_range(start_date, max_available_date)
        multiplier_after = (1 + forecast_value / 100) ** ((end_date - max_available_date).days / 30)
        return multiplier_within * multiplier_after
    else:
        total_months = (end_date - start_date).days / 30
        return (1 + forecast_value / 100) ** total_months

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c

def calculate_dists(lat, lon, poi_coords):
    min_distances = {}
    for poi_type, points in poi_coords.items():
        dist = float('inf')
        for poi_lat, poi_lon in points:
            dist = min(haversine(lat, lon, poi_lat, poi_lon), dist)
        min_distances[f'dist_to_{poi_type}_km'] = dist
    return min_distances