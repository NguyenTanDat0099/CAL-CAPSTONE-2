# CalAI Charts Module
# Import all chart functions for easy access
from .codes import (
    # Line Chart
    plot_single_line,
    plot_multiple_lines,
    pandas_line_chart,
    LineChartConfig,
    # Bar Chart
    plot_vertical_bar,
    plot_horizontal_bar,
    plot_grouped_bar,
    plot_stacked_bar,
    pandas_bar_chart,
    BarChartConfig,
    # Scatter
    plot_scatter,
    plot_scatter_groups,
    plot_bubble,
    pandas_scatter,
    ScatterConfig,
    # Histogram
    plot_histogram,
    plot_multiple_histograms,
    plot_stacked_histogram,
    pandas_histogram,
    HistogramConfig,
    # Box
    plot_box,
    plot_grouped_box,
    plot_horizontal_box,
    pandas_box,
    BoxConfig,
    # Pie
    plot_pie,
    plot_donut,
    pandas_pie,
    PieConfig,
    # Heatmap
    plot_heatmap,
    plot_correlation_heatmap,
    plot_seaborn_heatmap,
    HeatmapConfig,
    # Area
    plot_area,
    plot_stacked_area,
    plot_overlapping_area,
    pandas_area_chart,
    AreaConfig,
)

# Backward-compatible aliases (short names)
line_chart = plot_single_line
bar_chart = plot_vertical_bar
scatter_chart = plot_scatter
histogram = plot_histogram
box_chart = plot_box
pie_chart = plot_pie
heatmap = plot_heatmap
area_chart = plot_area

__all__ = [
    # Line Chart
    'plot_single_line', 'plot_multiple_lines', 'pandas_line_chart',
    'LineChartConfig', 'line_chart',
    # Bar Chart
    'plot_vertical_bar', 'plot_horizontal_bar', 'plot_grouped_bar',
    'plot_stacked_bar', 'pandas_bar_chart', 'BarChartConfig', 'bar_chart',
    # Scatter
    'plot_scatter', 'plot_scatter_groups', 'plot_bubble', 'pandas_scatter',
    'ScatterConfig', 'scatter_chart',
    # Histogram
    'plot_histogram', 'plot_multiple_histograms', 'plot_stacked_histogram',
    'pandas_histogram', 'HistogramConfig', 'histogram',
    # Box
    'plot_box', 'plot_grouped_box', 'plot_horizontal_box', 'pandas_box',
    'BoxConfig', 'box_chart',
    # Pie
    'plot_pie', 'plot_donut', 'pandas_pie', 'PieConfig', 'pie_chart',
    # Heatmap
    'plot_heatmap', 'plot_correlation_heatmap', 'plot_seaborn_heatmap',
    'HeatmapConfig', 'heatmap',
    # Area
    'plot_area', 'plot_stacked_area', 'plot_overlapping_area',
    'pandas_area_chart', 'AreaConfig', 'area_chart',
]
