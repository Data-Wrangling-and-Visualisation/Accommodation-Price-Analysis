from flask import Blueprint
from .utils import load_data, filter_data
from flask import Blueprint, jsonify, render_template, request


main_bp = Blueprint('main', __name__)
df = load_data()

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/data', methods=['GET'])
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
    # print(filtered_df.to_dict(orient='records')[0])
    return jsonify(filtered_df.to_dict(orient='records'))