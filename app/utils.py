import pandas as pd
import os

def load_data():
    df = pd.read_csv('./data/main_data.csv')
    df['date'] = pd.to_datetime(df['date'])
    df = df[['price', 'longitude', 'floor', 'floors_count', 'date', 'latitude', 'rooms_count', 'total_meters', 'price_per_sqm', 'price_per_sqm_adjusted', 'cluster']]
    return df.head(1000)

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