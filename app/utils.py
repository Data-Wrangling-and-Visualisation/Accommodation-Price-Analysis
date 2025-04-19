from scipy.spatial import KDTree
from datetime import datetime
import pandas as pd
import numpy as np
import os

poi_trees = {}

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

def initialize_kdtrees(poi_coords):
    """
    Initialize KDTree for each POI type globally using 3D coordinates.
    """
    global poi_trees
    poi_trees = {
        poi_type: KDTree(np.array([_to_3d(lat, lon) for lat, lon in points]))
        for poi_type, points in poi_coords.items()
    }

def _to_3d(lat, lon):
    """
    Convert latitude and longitude to 3D Cartesian coordinates on a sphere.
    """
    R = 6371  # Earth radius in kilometers
    lat_rad, lon_rad = np.radians(lat), np.radians(lon)
    x = R * np.cos(lat_rad) * np.cos(lon_rad)
    y = R * np.cos(lat_rad) * np.sin(lon_rad)
    z = R * np.sin(lat_rad)
    return [x, y, z]

def calculate_dists(lat, lon):
    """
    Calculate the minimum distances to various Points of Interest (POI) using precomputed KDTree.
    Distances are calculated in kilometers on the surface of the Earth.
    """
    query_point = np.array(_to_3d(lat, lon))
    min_distances = {}

    for poi_type, tree in poi_trees.items():
        dist, _ = tree.query(query_point, k=1)  # Get nearest neighbor
        # Convert Euclidean distance in 3D to great-circle distance
        min_distances[f'dist_to_{poi_type}_km'] = _euclidean_to_great_circle(dist)

    return min_distances

def _euclidean_to_great_circle(euclidean_dist):
    """
    Convert Euclidean distance in 3D space to great-circle distance on the sphere.
    """
    R = 6371  # Earth radius in kilometers
    return R * np.arcsin(euclidean_dist / (2 * R)) * 2