# Accommodation Price Analysis

This project investigates how accommodation prices are influenced by multidimensional factors, including geographic location, transportation infrastructure, and macroeconomic indicators. The end goal is to build an interactive web application that visualizes housing market trends and allows users to simulate scenarios based on economic variables.

## Key Features
- **Interactive Map Visualization**: Prices are displayed on a map using **Delaunay Triangulation**, which provides a good interpolation of price data across geographic regions.
- **Scenario Simulation**: Users can adjust economic variables to simulate their impact on housing prices.
- **Data-Driven Insights**: Combines geographic, transportation, and macroeconomic data to provide actionable insights into the housing market.

> **Note**: This project is still in progress. Contributions and feedback are welcome!

---

## Repository Structure

The repository is organized as follows:

```
Accommodation-Price-Analysis/
├── app/                     # Backend and frontend code for the web application
│   ├── model/               # Stores ML model for price prediction
│   ├── static/              # Static assets (CSS, JavaScript, images)
│   ├── templates/           # HTML templates for rendering views
│   ├── routes.py            # Flask routes and application logic
│   └── utils.py             # Helper functions and utilities
├── notebooks/               # Jupyter notebooks for exploratory data analysis
├── requirements.txt         # Python dependencies
├── README.md
└── .gitignore
```

---

## Getting Started

### Prerequisites
- Python 3.8 or higher
- A modern web browser

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Data-Wrangling-and-Visualisation/Accommodation-Price-Analysis.git
   cd Accommodation-Price-Analysis
   ```

2. **Set up the virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the web server**:
   ```bash
   cd app
   python routes.py
   ```

5. **Access the application**:
   Open your browser and navigate to [http://localhost:5000](http://localhost:5000).

---

## Technologies Used

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript (with Leaflet.js for map visualization)
- **Data Processing**: Pandas, NumPy
- **Visualization**: Delaunay Triangulation, Matplotlib
- **Other Tools**: Jupyter Notebooks for exploratory analysis
