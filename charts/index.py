"""
CalAI Charts - Chỉ mục trung tâm
================================
Mỗi khi prompt chứa keywords liên quan đến matplotlib/pandas,
sử dụng file này để tìm file prompt và file code tương ứng.

CẤU TRÚC THƯ MỤC:
==================
charts/
├── prompts/           ← Mô tả keywords cho từng loại biểu đồ
│   ├── 01_line_chart_prompt.md
│   ├── 02_bar_chart_prompt.md
│   ├── 03_scatter_chart_prompt.md
│   ├── 04_histogram_prompt.md
│   ├── 05_box_chart_prompt.md
│   ├── 06_pie_chart_prompt.md
│   ├── 07_heatmap_prompt.md
│   └── 08_area_chart_prompt.md
├── codes/             ← File code Python cho từng loại biểu đồ
│   ├── line_chart.py
│   ├── bar_chart.py
│   ├── scatter_chart.py
│   ├── histogram.py
│   ├── box_chart.py
│   ├── pie_chart.py
│   ├── heatmap.py
│   └── area_chart.py
└── index.py          ← File chỉ mục này

CÁCH SỬ DỤNG:
=============
1. Đọc file prompt tương ứng để hiểu keywords và prompt template
2. Import file code và sử dụng các hàm đã định nghĩa
3. Thay đổi tham số theo nhu cầu

TỪ KHÓA TRA CỨU NHANH:
======================

| Keywords trong prompt                    | File Prompt                  | File Code                  |
|-----------------------------------------|------------------------------|----------------------------|
| line, đường, trend, multiple lines      | 01_line_chart_prompt.md      | line_chart.py              |
| bar, cột, grouped, stacked, horizontal  | 02_bar_chart_prompt.md       | bar_chart.py               |
| scatter, phân tán, bubble, correlation   | 03_scatter_chart_prompt.md   | scatter_chart.py           |
| hist, tần suất, phân bố, bins, kde      | 04_histogram_prompt.md       | histogram.py               |
| box, hộp, outlier, quartile, median     | 05_box_chart_prompt.md       | box_chart.py               |
| pie, tròn, donut, percentage, slice      | 06_pie_chart_prompt.md       | pie_chart.py               |
| heatmap, ma trận, nhiệt, correlation    | 07_heatmap_prompt.md         | heatmap.py                 |
| area, vùng, stacked, overlapping        | 08_area_chart_prompt.md      | area_chart.py              |

VÍ DỤ SỬ DỤNG:
================

# Line Chart
from charts.codes import plot_single_line, plot_multiple_lines
plot_single_line(x, y, title='Biểu đồ đường', color='#3498db', marker='o')

# Bar Chart
from charts.codes import plot_grouped_bar
plot_grouped_bar(df, x_col='Sản phẩm', columns=['Q1','Q2','Q3','Q4'])

# Scatter Plot
from charts.codes import plot_scatter
plot_scatter(x, y, c=colors, cmap='viridis', regression=True)

# Histogram
from charts.codes import plot_histogram
plot_histogram(data, bins=30, kde=True, mean_line=True)

# Box Plot
from charts.codes import plot_box
plot_box([group1, group2, group3], labels=['A','B','C'], showmeans=True)

# Pie Chart
from charts.codes import plot_pie, plot_donut
plot_donut(values, labels=names, center_label='Total', center_value='1000M')

# Heatmap
from charts.codes import plot_heatmap, plot_correlation_heatmap
plot_correlation_heatmap(df, mask_upper=True, annot_format='.2f')

# Area Chart
from charts.codes import plot_stacked_area
plot_stacked_area(df, x='Tháng', columns=['A','B','C'], stacked=True)
"""

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

# Backward-compatible short-name aliases
line_chart = plot_single_line
bar_chart = plot_vertical_bar
scatter_chart = plot_scatter
histogram = plot_histogram
box_chart = plot_box
pie_chart = plot_pie
heatmap = plot_heatmap
area_chart = plot_area


CHART_KEYWORDS = {
    "line_chart": {
        "prompt": "charts/prompts/01_line_chart_prompt.md",
        "code": "charts/codes/line_chart.py",
        "functions": ["plot_single_line", "plot_multiple_lines", "pandas_line_chart"],
        "keywords": [
            "line", "đường", "trend", "multiple lines", "two lines", "multi-line",
            "linestyle", "linewidth", "marker", "fill_between", "dual axis", "twiny"
        ],
    },
    "bar_chart": {
        "prompt": "charts/prompts/02_bar_chart_prompt.md",
        "code": "charts/codes/bar_chart.py",
        "functions": ["plot_vertical_bar", "plot_horizontal_bar", "plot_grouped_bar", "plot_stacked_bar"],
        "keywords": [
            "bar", "cột", "grouped", "stacked", "horizontal", "vertical bar",
            "barh", "colormap", "width", "edgecolor"
        ],
    },
    "scatter_chart": {
        "prompt": "charts/prompts/03_scatter_chart_prompt.md",
        "code": "charts/codes/scatter_chart.py",
        "functions": ["plot_scatter", "plot_scatter_groups", "plot_bubble", "pandas_scatter"],
        "keywords": [
            "scatter", "phân tán", "bubble", "correlation", "cmap", "vmin", "vmax",
            "regression", "trendline", "size encoding", "color encoding"
        ],
    },
    "histogram": {
        "prompt": "charts/prompts/04_histogram_prompt.md",
        "code": "charts/codes/histogram.py",
        "functions": ["plot_histogram", "plot_multiple_histograms", "plot_stacked_histogram", "pandas_histogram"],
        "keywords": [
            "hist", "histogram", "tần suất", "phân bố", "bins", "kde", "density",
            "distribution", "normal", "skewed", "mean line", "median line"
        ],
    },
    "box_chart": {
        "prompt": "charts/prompts/05_box_chart_prompt.md",
        "code": "charts/codes/box_chart.py",
        "functions": ["plot_box", "plot_grouped_box", "plot_horizontal_box", "pandas_box"],
        "keywords": [
            "box", "hộp", "outlier", "quartile", "median", "whisker", "patch_artist",
            "showmeans", "meanline", "notch", "flier"
        ],
    },
    "pie_chart": {
        "prompt": "charts/prompts/06_pie_chart_prompt.md",
        "code": "charts/codes/pie_chart.py",
        "functions": ["plot_pie", "plot_donut", "pandas_pie"],
        "keywords": [
            "pie", "tròn", "donut", "percentage", "slice", "autopct", "explode",
            "startangle", "wedge", "shadow", "legend"
        ],
    },
    "heatmap": {
        "prompt": "charts/prompts/07_heatmap_prompt.md",
        "code": "charts/codes/heatmap.py",
        "functions": ["plot_heatmap", "plot_correlation_heatmap", "plot_seaborn_heatmap"],
        "keywords": [
            "heatmap", "bản đồ nhiệt", "ma trận", "correlation matrix", "annot",
            "colormap", "cmap", "colorbar", "vmin", "vmax", "center", "mask",
            "imshow", "seaborn heatmap"
        ],
    },
    "area_chart": {
        "prompt": "charts/prompts/08_area_chart_prompt.md",
        "code": "charts/codes/area_chart.py",
        "functions": ["plot_area", "plot_stacked_area", "plot_overlapping_area", "pandas_area_chart"],
        "keywords": [
            "area", "vùng", "stacked area", "overlapping area", "fill_between",
            "baseline", "stacked", "alpha", "colormap"
        ],
    },
}


def find_chart_type(keyword: str) -> dict:
    """
    Tìm loại biểu đồ phù hợp dựa trên keyword.

    Args:
        keyword: từ khóa từ prompt (tiếng Việt hoặc Anh)

    Returns:
        dict chứa thông tin chart type, file prompt và file code
    """
    kw_lower = keyword.lower()
    for chart_type, info in CHART_KEYWORDS.items():
        for k in info["keywords"]:
            if k.lower() in kw_lower or kw_lower in k.lower():
                return {
                    "type": chart_type,
                    "prompt_file": info["prompt"],
                    "code_file": info["code"],
                    "functions": info["functions"],
                    "matched_keyword": k,
                }
    return {"type": "unknown", "prompt_file": None, "code_file": None, "functions": [], "matched_keyword": None}


def list_available_charts() -> None:
    """In ra danh sách các loại biểu đồ và keywords tương ứng."""
    print("=" * 70)
    print("DANH SÁCH BIỂU ĐỒ KHẢ DỤNG")
    print("=" * 70)
    for chart_type, info in CHART_KEYWORDS.items():
        print(f"\n[{chart_type.upper()}]")
        print(f"  Prompt:  {info['prompt']}")
        print(f"  Code:    {info['code']}")
        print(f"  Functions: {', '.join(info['functions'])}")
        print(f"  Keywords: {', '.join(info['keywords'][:6])}...")
    print("\n" + "=" * 70)


if __name__ == '__main__':
    print(__doc__)

    print("\n" + "=" * 70)
    print("VÍ DỤ TRA CỨU NHANH")
    print("=" * 70)

    test_keywords = [
        "vẽ biểu đồ đường theo thời gian",
        "bar chart grouped với nhiều nhóm",
        "scatter plot với regression line",
        "histogram có kde",
        "box plot với outliers",
        "pie chart dạng donut",
        "heatmap ma trận tương quan",
        "area chart stacked",
    ]

    for kw in test_keywords:
        result = find_chart_type(kw)
        print(f"\nPrompt: \"{kw}\"")
        print(f"  -> Chart: {result['type']}")
        print(f"  -> Prompt: {result['prompt_file']}")
        print(f"  -> Code:   {result['code_file']}")
        print(f"  -> Matched: '{result['matched_keyword']}'")
